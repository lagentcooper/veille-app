# 14. Architecture données — types, classification, stockage, chiffrement, rétention

> Règle AGENTS.md §6.5 : toute nouvelle donnée s'ajoute ici **dans le même commit** que le code qui l'introduit.

Échelle de classification : voir `docs/architecture/04-data-flow-map.md` §6.3 (C0 → C4).

---

## 14.1 Inventaire des données

### Profil et compte

| Donnée | Classe | Justification (finalité) | Stockage | Chiffrement | Rétention |
|--------|--------|--------------------------|----------|-------------|-----------|
| Prénom / nom d'usage | C2 | Personnalisation, remplissage du document | Appareil | Base chiffrée | Jusqu'à suppression |
| Code applicatif | C4 | Authentification locale | Phase 1 : **jamais stocké** (sert à dériver la KEK à chaque déverrouillage) · Phase 3 : secure element | Dérivation Argon2id + sel | Jusqu'à suppression |
| Préférences / accessibilité | C1 | UX | Appareil | Base chiffrée | Idem |
| Consentements (objet, date, version du texte, révocation) | C1 | **Preuve de conformité** | Appareil (+ serveur en Phase 3) | Chiffré | 3 ans après révocation ⚖️ |
| Email / téléphone (Phase 3) | C2 | Compte, contre-notification d'activation | Serveur | Chiffré applicativement | Durée du compte + 30 j |

### Document de legs

| Donnée | Classe | Finalité | Stockage | Chiffrement | Rétention |
|--------|--------|----------|----------|-------------|-----------|
| Contenu (bénéficiaires, biens, volontés) | **C3** | Fonction principale | Appareil (+ blob opaque si sauvegarde) | AES-256-GCM, DEK dédiée | Jusqu'à suppression / activation |
| Versions historiques | C3 | Traçabilité exigée | Appareil | Idem | Toutes conservées jusqu'à suppression |
| Hash + horodatage de version | C1 | Intégrité | Appareil (+ audit) | — (non réversible) | Longue |
| Statut de complétude, alertes déclenchées | C1 | Parcours | Appareil | Base chiffrée | Idem |
| Emplacement déclaré du testament manuscrit | C3 | Aider les héritiers | Appareil | Chiffré | Idem |

### Documents justificatifs

| Donnée | Classe | Finalité | Stockage | Chiffrement | Rétention |
|--------|--------|----------|----------|-------------|-----------|
| Fichier original | **C3** (potentiellement art. 9) | Conservation par l'utilisateur | Fichier sandbox (+ blob) | DEK par fichier | Choix de l'utilisateur |
| Métadonnées (titre, catégorie, date, émetteur) | C3 | Organisation, recherche | Base chiffrée | Base chiffrée | Idem |
| Texte OCR | **C3** | Recherche, IA | Base chiffrée | Idem | Supprimé avec la source |
| Embeddings / index vectoriel | **C3** (ré-identifiants) | Recherche sémantique | Base chiffrée, **appareil seulement** | Idem | Supprimé avec la source |
| Vignettes/aperçus | C3 | UX | Fichier chiffré | Idem | Supprimé avec la source |
| Hash du fichier | C1 | Intégrité, déduplication | Base | — | Idem |

### Contact de confiance

| Donnée | Classe | Finalité | Stockage | Chiffrement | Rétention |
|--------|--------|----------|----------|-------------|-----------|
| Identité du contact (**donnée d'un tiers**) | C2 | Désignation, notification | Appareil (+ serveur Phase 3) | Chiffré | Jusqu'à révocation + 30 j |
| Canaux (email/téléphone) | C2 | Notification d'activation | Idem | Chiffré | Idem |
| Jeu de droits et périmètre du paquet | C1 | Contrôle d'accès | Appareil + serveur | Chiffré | Idem |
| Dossier d'activation (preuves, acte de décès) | C2/C3 | Anti-fraude, décision | Serveur, accès restreint | Chiffré au repos | ⚖️ à définir (proposition : 5 ans, valeur probatoire) |
| Décision de revue humaine | C1 | Preuve | Audit WORM | — | Longue |

### Technique

| Donnée | Classe | Finalité | Stockage | Rétention |
|--------|--------|----------|----------|-----------|
| Logs techniques (sans PII) | C1 | Diagnostic | Local (P1) / centralisé (P3) | 30 jours |
| Audit trail | C1 | Preuve, détection d'abus | Local + WORM serveur | ⚖️ 5–10 ans à valider |
| Télémétrie produit (opt-in) | C1 | Amélioration | Serveur UE | 13 mois max |
| Identifiant d'installation | C1 | Corrélation technique | Appareil | Rotatif, réinitialisable |

**Jamais collecté (décision explicite) :** géolocalisation, contacts du téléphone, identifiants
publicitaires, historique de navigation, données biométriques brutes (seule l'API OS est utilisée,
le gabarit ne quitte jamais le secure element), contenu des documents côté serveur.

---

## 14.2 Chiffrement — schéma de clés

**Cible (Phase 3+)**

```
Code utilisateur ──Argon2id──┐
                             ├──► déverrouille la KEK (dans Secure Enclave/StrongBox, non exportable)
Biométrie (OS) ──────────────┘            │
                                          ├──► déchiffre DEK_db      ──► base SQLCipher
                                          ├──► déchiffre DEK_doc_i   ──► fichier i (AES-256-GCM)
                                          └──► déchiffre DEK_legacy  ──► paquet successoral

Clé de récupération (hors appareil, affichée une fois) ──Argon2id──► KEK de secours
```

**Phase 1 — PWA** ([ADR-0003](../decisions/0003-local-first-chiffrement.md) §Variante Phase 1)

```
Code utilisateur ──Argon2id (WASM)──► KEK  (CryptoKey non extractible, EN MÉMOIRE SEULEMENT,
                                      │     jamais écrite dans IndexedDB/OPFS/localStorage)
                                      ├──► déchiffre DEK_meta    ──► métadonnées (IndexedDB)
                                      └──► déchiffre DEK_doc_i   ──► fichier i (OPFS, AES-256-GCM)

Pas de secure element · pas de biométrie · pas de clé de récupération (Phase 2)
Verrouillage ou rechargement ⇒ la KEK disparaît, le code doit être ressaisi
```

Propriétés recherchées :
- Une DEK par document ⇒ **partage sélectif** possible (paquet successoral) et **suppression
  cryptographique** unitaire. Vrai dans les deux variantes.
- Phase 3 : la KEK ne sort jamais du matériel ⇒ un vol de fichiers sans l'appareil est inexploitable.
- Phase 1 : la KEK n'est **jamais écrite** ⇒ une copie du profil navigateur ne contient que du
  chiffré, mais la résistance ne tient plus qu'au code applicatif et au coût Argon2id. Limite
  assumée, affichée à l'utilisateur, et bornée par l'interdiction d'y déposer de vrais documents.
- Le serveur ne détient aucune clé (ADR-0010).
- Rotation : changement de code ⇒ ré-encapsulage des DEK uniquement (pas de re-chiffrement des contenus).

⚖️ Le mécanisme exact de libération de `DEK_legacy` à l'activation est **la décision cryptographique
la plus délicate du projet** : trois options sont documentées dans [ADR-0005](../decisions/0005-contact-de-confiance.md) §Options,
et le choix doit être fait en Phase 2, avec revue externe.

---

## 14.3 Rétention et suppression

| Événement | Effet |
|-----------|-------|
| Suppression d'un document | Fichier effacé + **DEK détruite** + OCR, embeddings, vignettes, index supprimés + événement d'audit (sans titre) |
| Suppression d'une version de legs | Refusée par défaut (historique exigé) ; suppression totale du document possible |
| Suppression du compte | Tout supprimé localement ; blobs serveur effacés ; audit conservé sous forme **anonymisée** (identifiant rompu) ⚖️ |
| Désinstallation | Les données locales disparaissent ; **avertir l'utilisateur** de faire un export au préalable |
| **Phase 1 — effacement des données de site par le navigateur** | Même effet qu'une désinstallation, mais **sans action de l'utilisateur** (R26) : persistance demandée, état affiché, export encouragé |
| Révocation d'un contact | Ses droits sont détruits, le paquet est re-scellé, notification envoyée |
| Activation réalisée | Accès du contact expirant automatiquement ; données conservées selon la volonté exprimée ⚖️ |

Principe : **la suppression est réelle et vérifiée par test**, jamais un simple drapeau `deleted = true`.

---

## 14.4 Points nécessitant une validation juridique

1. Durées de conservation (audit, dossiers d'activation, consentements).
2. Statut des données après le décès (art. 85 LIL) et modalités de transmission.
3. Nécessité d'un hébergeur HDS pour des documents de santé chiffrés de bout en bout.
4. Information et base légale du traitement des **données du contact de confiance** (un tiers qui n'a
   pas consenti au moment de la désignation).
5. Qualification du responsable de traitement en Phase 1 (application purement locale).
6. Contenu de l'AIPD/DPIA et moment de sa réalisation.
