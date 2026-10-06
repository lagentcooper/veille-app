# 8. Observabilité, logs, monitoring, audit

Principe fondateur : **on observe le système, jamais le contenu des utilisateurs.**
Décision : [ADR-0009](../decisions/0009-observabilite-sans-pii.md).

---

## 8.1 Les trois journaux — à ne jamais confondre

| Journal | Finalité | Contenu | Rétention | Visible par |
|---------|----------|---------|-----------|-------------|
| **Log technique** | Diagnostiquer un incident | Événement, code, durée, version, identifiant de corrélation | 30 jours | SRE/dev |
| **Audit trail** | Prouver qui a fait quoi (activation, accès, suppression, export) | Acteur pseudonymisé, action, objet, résultat, horodatage, hash du précédent | Longue (à définir ⚖️) | Utilisateur (sa partie) + conformité |
| **Télémétrie produit** | Améliorer l'UX | Événements agrégés, opt-in, ID rotatif | Courte | Produit |

Trois stockages distincts, trois politiques d'accès distinctes. Un log technique ne sert jamais de
preuve ; un audit ne sert jamais de debug.

---

## 8.2 Règles de journalisation (applicables dès la Phase 1)

**Interdit dans un log, quel que soit le niveau :**
nom, prénom, email, téléphone, adresse, IBAN, NIR, date de naissance, titre de document,
nom de fichier, extrait OCR, prompt utilisateur, réponse IA, montant, clé, jeton, identifiant de session brut.

**Autorisé :** identifiants opaques (`docId` aléatoire sans signification), catégorie, taille en
tranches (`<1Mo`, `1-10Mo`), code d'erreur, durée, version d'app/OS/schéma, `traceId`.

Mise en œuvre technique :
- Un **logger unique** dans `packages/core/src/ports/Logger.ts` ; `console.log` interdit par ESLint.
- Le logger accepte un **objet typé d'événements** (`AppEvent` union), pas des chaînes libres →
  impossible d'y glisser du contenu par accident.
- **Redaction par défaut** : tout champ non déclaré dans la liste d'autorisation est supprimé.
- Test automatisé : un scan des sorties de log en CI échoue si un motif PII est détecté
  (email, IBAN, téléphone, NIR), y compris dans les messages d'erreur.
- Les erreurs natives/stack traces sont nettoyées (pas de chemin de fichier utilisateur).

---

## 8.3 Phase 1 vs production

| | Phase 1 (POC) | Production |
|---|---------------|------------|
| Logs | Locaux uniquement, tampon circulaire en mémoire, visibles par l'utilisateur via « Journal technique » | Centralisés (OpenTelemetry → collecteur → backend de logs) |
| Crash reporting | **Aucun envoi** | Opt-in, avec scrubbing agressif et serveur UE (ex. Sentry auto-hébergé) |
| Métriques | Aucune | Prometheus/OTLP + tableaux de bord |
| Traces | Aucune | OpenTelemetry, échantillonnage, corrélation `traceId` |
| Audit | Local, append-only, exportable par l'utilisateur | Local + serveur WORM chaîné par hash |

---

## 8.4 Audit trail — conception

- **Append-only** : aucune modification, aucune suppression (sauf purge de rétention globale).
- **Chaînage par hash** : `hash(n) = H(hash(n-1) || event(n))` → toute altération est détectable.
- **Sans contenu** : on journalise « document `d_8f3a` exporté », pas son titre.
- Événements obligatoires : création/modification/validation du legs, ajout/suppression/export de
  document, désignation/révocation d'un contact, **toute étape d'activation**, tout accès accordé,
  tout changement de consentement, toute rotation de clé.
- **L'utilisateur peut consulter et exporter son propre audit** : c'est un élément de confiance et
  un moyen de détecter un abus.

---

## 8.5 Monitoring et alertes (production)

**SLI/SLO de départ :** disponibilité API 99.5 %, latence p95 < 500 ms, taux d'erreur < 1 %,
succès de sauvegarde 100 %, succès de restauration testée mensuellement.

**Alertes de sécurité prioritaires** (les plus importantes du produit) :

| Signal | Seuil | Action |
|--------|-------|--------|
| Demandes d'activation anormales (volume, même IP, même contact) | Tout écart | Blocage + revue humaine immédiate |
| Échecs d'authentification en rafale | Seuil adaptatif | Ralentissement, verrouillage, notification |
| Accès back-office hors horaires / hors périmètre | Tout | Alerte + revue |
| Téléchargement massif de blobs | Tout | Coupure automatique |
| Déploiement non approuvé, changement IaC hors pipeline | Tout | Alerte critique |
| Détection de PII dans les logs | Tout | **Incident** : purge + correctif + post-mortem |

**Corrélation** : `traceId` propagé de l'app jusqu'aux services ; pour l'audit, un
`activationCaseId` relie tous les événements d'un dossier. Détection d'anomalies : commencer par des
règles simples et lisibles (seuils, listes), pas de ML — un faux positif sur une activation a un
coût humain élevé.
