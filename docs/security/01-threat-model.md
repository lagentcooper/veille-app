# 12. Threat model initial

Méthode : identification des actifs → acteurs de menace → analyse STRIDE par frontière de confiance
→ risques priorisés → mitigations. Document **vivant** : à réviser à chaque changement de périmètre
(nouveau flux, nouveau composant, nouveau tiers).

> **Phase 1 — le POC est une PWA** ([ADR-0011](../decisions/0011-pwa-poc-phase-1.md)). Le navigateur
> ajoute une frontière et une classe de menaces qui n'existent pas sur une application native :
> voir **TB-0** et les risques **R25 à R28**. Les mitigations reposant sur le secure element ou sur
> l'exclusion des sauvegardes OS ne sont **pas disponibles en Phase 1** ; la colonne « Mitigation »
> l'indique à chaque fois. C'est la raison pour laquelle le POC interdit d'y déposer de vrais
> documents : le risque résiduel est assumé par le périmètre d'usage, pas par la technique.

---

## 12.1 Actifs à protéger (par ordre de valeur)

| # | Actif | Impact si compromis |
|---|-------|---------------------|
| A1 | **Clés de chiffrement utilisateur** (KEK, DEK, clé de récupération) | Accès à tout le contenu. Irréversible. |
| A2 | **Contenu des documents personnels** | Atteinte grave à la vie privée, fraude, chantage. Données possiblement art. 9 RGPD. |
| A3 | **Document de legs** | Atteinte à l'intimité, conflits familiaux, manipulation successorale. |
| A4 | **Mécanisme d'activation successorale** | **Vol de l'ensemble des données par un tiers** via fausse déclaration de décès. |
| A5 | Identité et session de l'utilisateur | Usurpation. |
| A6 | Coordonnées du contact de confiance (donnée d'un tiers) | Fuite de données de tiers, phishing ciblé. |
| A7 | Journal d'audit | Perte de capacité de preuve et de détection. |
| A8 | Disponibilité et intégrité des données | Perte définitive de documents importants. |
| A9 | Chaîne de build et de distribution | Compromission massive de tous les utilisateurs. |

---

## 12.2 Acteurs de menace

| Acteur | Motivation | Capacité |
|--------|-----------|----------|
| **Voleur d'appareil** | Revente, curiosité, fraude | Accès physique, outils grand public |
| **Proche malveillant** | Héritage, contrôle, curiosité | **Accès physique répété, connaît la victime, peut être le contact de confiance désigné** — acteur le plus dangereux de ce produit |
| **Attaquant opportuniste** | Données monnayables | Attaque à distance, phishing, malware |
| **Attaquant ciblé** | Données de valeur (notoriété, patrimoine) | Compétent, persistant |
| **Opérateur interne** | Curiosité, corruption, erreur | Accès privilégié à l'infrastructure |
| **Fournisseur compromis** | Supply chain | Dépendance npm, action CI, modèle IA, SDK |
| **Autorité / réquisition** | Légale | Demande contraignante au service |
| **L'utilisateur lui-même** | Erreur | Supprime, perd son code, exporte vers un cloud non protégé |

---

## 12.3 Risques principaux (STRIDE, par frontière)

### TB-0 — Navigateur et origine web (Phase 1 uniquement)

Frontière propre à la PWA. Elle disparaît quand l'application native remplace le POC en Phase 3.

| ID | Menace | STRIDE | V×I | Mitigation |
|----|--------|--------|-----|------------|
| R25 | **XSS sur l'origine** : un script injecté s'exécute avec tous les droits de l'application et peut **utiliser** la KEK en mémoire sans jamais la lire | E, I | Moyenne × **Critique** | CSP stricte (ni `unsafe-inline`, ni `eval`), **aucune dépendance servie par un CDN tiers** (tout est bundlé et servi par l'origine), SRI, échappement par défaut de React, revue du service worker comme du code crypto, tests CSP en CI. ⚠️ **Aucune mitigation ne ramène ce risque au niveau d'une app native** : c'est le prix du POC web, et la raison de l'interdiction d'y mettre de vrais documents |
| R26 | **Éviction du stockage par le navigateur** (pression disque, nettoyage automatique, mode privé) ⇒ perte définitive des documents | D | **Élevée** × Élevé | `navigator.storage.persist()` demandé au premier document, **état affiché** dans l'écran « Où sont mes données ? », incitation explicite à l'export, avertissement si la persistance est refusée. Le POC ne doit jamais être l'unique exemplaire d'un document |
| R27 | **Extension de navigateur malveillante ou trop permissive** : accès au DOM et au stockage de l'origine | I, T | Moyenne × Critique | Hors de portée de l'application (une extension a plus de droits que la page). Documenté, **non mitigeable** ; argument supplémentaire pour le natif en Phase 3 |
| R28 | **Compromission de l'hébergement statique ou du service worker** : livraison d'une version piégée, persistante pour tous les visiteurs | T, I | Faible × **Critique** | Hébergement UE minimal, accès restreint et MFA, déploiement depuis la CI uniquement, SRI, revue obligatoire de `apps/web/src/sw/`, politique de mise à jour du SW explicite (pas de `skipWaiting` silencieux) |

### TB-2 — Appareil

| ID | Menace | STRIDE | Vraisemblance × Impact | Mitigation |
|----|--------|--------|------------------------|------------|
| R1 | Appareil volé/perdu, contenu extrait | I(nfo) | Élevée × Critique | Chiffrement au repos, verrouillage automatique, aucune donnée en clair. **Phase 3** : clé dans le secure element liée à la biométrie/code. **Phase 1** : la KEK n'étant jamais persistée, l'extraction du profil navigateur ne donne que du chiffré — la résistance repose alors sur le code applicatif et le coût Argon2id |
| R2 | **Proche ayant le code de déverrouillage de l'appareil** | I, E(levation) | Élevée × Critique | Code **propre à l'application**, distinct de celui de l'appareil ; verrouillage court ; ⚠️ risque résiduel assumé et documenté |
| R3 | Sauvegarde ou synchronisation exposant les données | I | Moyenne × Élevé | **Phase 3** : exclusion du conteneur sensible des sauvegardes OS ; clé non exportable ⇒ sauvegarde inutilisable ailleurs. **Phase 1** : aucune API d'exclusion côté navigateur ; la garantie tient à ce que la KEK n'est jamais écrite sur disque, donc un profil synchronisé ne contient que du chiffré |
| R4 | Appareil rooté/jailbreaké, malware, keylogger | I, T | Moyenne × Critique | Détection best-effort + avertissement (Phase 3), pas de fausse promesse ; `FLAG_SECURE`, masquage du sélecteur de tâches. **Phase 1** : aucune de ces mesures n'existe sur le web |
| R5 | Capture d'écran / observation par-dessus l'épaule | I | Élevée × Moyen | **Phase 3** : masquage en arrière-plan, option anti-capture sur les écrans sensibles, pas d'aperçu dans les notifications. **Phase 1** : verrouillage à la perte de visibilité de l'onglet ; l'anti-capture n'existe pas sur le web |
| R6 | Export non chiffré déposé dans un cloud grand public | I | Élevée × Élevé | **Export chiffré par défaut**, avertissement explicite si l'utilisateur choisit le clair |

### TB-6 — Contact de confiance (risque n°1 du produit)

| ID | Menace | STRIDE | V×I | Mitigation |
|----|--------|--------|-----|------------|
| R7 | **Fausse déclaration de décès** pour obtenir l'accès | S(poofing), E | Moyenne × **Critique** | Preuve documentaire (acte de décès) + **revue humaine** + **délai de carence** + **contre-notification multi-canal** + possibilité d'annulation en un geste + audit + limitation de débit/alerte |
| R8 | Usurpation du contact désigné | S | Moyenne × Critique | Enrôlement du contact, lien à usage unique, vérification d'identité **au moment de l'activation**, second facteur |
| R9 | Contact légitime mais curieux avant décès | I | Élevée × Élevé | **Aucun accès avant activation** (invariant A3) : techniquement, il n'a pas la clé |
| R10 | Accès trop large après activation | I | Moyenne × Élevé | L'utilisateur définit à l'avance le **paquet successoral** (sous-ensemble) ; accès **temporaire**, en lecture, tracé, expirant |
| R11 | Contact de confiance indisponible/décédé | Disponibilité | Moyenne × Élevé | Contacts multiples ordonnés, quorum M sur N, procédure de repli (notaire/héritier), relances |
| R12 | Collusion avec un opérateur interne | E | Faible × Critique | Double validation humaine, séparation des rôles, audit inaltérable, opérateur sans accès au contenu |

### TB-3 — Service

| ID | Menace | STRIDE | V×I | Mitigation |
|----|--------|--------|-----|------------|
| R13 | Compromission du serveur | I | Moyenne × Élevé (**pas critique par conception**) | E2EE : les blobs sont inexploitables ; segmentation ; secrets en KMS ; moindre privilège |
| R14 | Compromission de la base de métadonnées | I | Moyenne × Moyen | Minimisation, chiffrement applicatif des champs sensibles, pseudonymisation |
| R15 | Abus d'API (énumération, DoS) | D, I | Élevée × Moyen | Rate limiting, quotas, WAF, identifiants opaques non énumérables |
| R16 | Opérateur curieux | I | Moyenne × Élevé | Pas d'accès au contenu (impossible techniquement), JIT + MFA + audit sur le back-office |
| R17 | Réquisition / demande légale | I | Faible × Moyen | Ne pas détenir les clés ; politique de transparence ⚖️ |

### TB-5 — Chaîne d'approvisionnement

| ID | Menace | V×I | Mitigation |
|----|--------|-----|------------|
| R18 | Dépendance npm malveillante (postinstall, exfiltration) | Moyenne × **Critique** | Lockfile, revue des nouvelles dépendances, audit + Grype, SBOM, CI sans secrets sur les PR externes |
| R19 | Action GitHub compromise | Faible × Critique | Épinglage par SHA, permissions minimales, OIDC, pas de `pull_request_target` |
| R20 | Modèle IA piégé | Faible × Élevé | Source contrôlée, vérification de signature/hash, version épinglée |
| R21 | Compte développeur / signature d'app compromis | Faible × Critique | MFA matérielle obligatoire, clés de signature gérées par EAS/HSM, alertes de release |

### IA

| ID | Menace | V×I | Mitigation |
|----|--------|-----|------------|
| R22 | **Prompt injection depuis un document importé** | Élevée × Élevé | Séparation instruction/contenu, **aucun outil accessible au modèle**, détection de motifs, corpus de tests en CI |
| R23 | Fuite de contexte vers un provider cloud | Faible (opt-in) × Critique | Désactivé par défaut, consentement par requête, liste d'hôtes autorisés, indication visuelle |
| R24 | Croisement involontaire entre documents | Moyenne × Moyen | Périmètre construit par le domaine, test d'isolation |

---

## 12.4 Risques résiduels assumés (à valider par le porteur du projet)

| Risque résiduel | Pourquoi il subsiste | Décision |
|-----------------|----------------------|----------|
| Proche ayant accès au téléphone déverrouillé **et** au code de l'app | Aucune solution technique complète | Assumé ; atténué par un code distinct et un verrouillage rapide |
| Perte du code de récupération ⇒ perte des données | Conséquence directe du zero-knowledge | **Arbitrage produit requis** (question critique n°7) |
| Appareil rooté avec malware au niveau système | Hors de portée d'une app | Assumé ; détection best-effort + avertissement |
| **Phase 1 : XSS ou extension de navigateur donnant l'usage de la KEK** (R25, R27) | Aucune mitigation technique ne ramène le web au niveau d'une app native | **Assumé pour le POC uniquement**, et compensé par le périmètre d'usage : version d'évaluation, données fictives, interdiction affichée d'y déposer de vrais documents (ADR-0011) |
| **Phase 1 : éviction du stockage par le navigateur** (R26) | Le navigateur reste maître de son quota | Assumé ; persistance demandée, état affiché, export encouragé. Le POC n'est jamais l'unique exemplaire d'un document |
| Fraude à l'activation malgré preuve + délai + revue | Aucun mécanisme n'est infaillible | Assumé ; réduit par la défense en profondeur ; couverture assurantielle à étudier ⚖️ |

---

## 12.5 Prochaines étapes sécurité

1. Écrire les **abuse cases** détaillés du parcours d'activation (Phase 2) avant tout code.
2. Définir la **procédure de gestion d'incident** et la politique de divulgation (`SECURITY.md`).
3. Faire réaliser une **revue externe du schéma cryptographique** avant la Phase 3.
4. Planifier un **pentest** (mobile + API + logique d'activation) en Phase 4.
5. **Phase 1** : faire relire la CSP, la politique de mise à jour du service worker et la chaîne de
   déploiement statique avant la première mise entre les mains de testeurs (R25, R28).
6. Réviser ce document à chaque nouveau flux (obligation DoD).
