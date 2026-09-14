# 6. Cartographie des données (Data Flow, Classification, Trust Boundaries, Dependencies, Infrastructure)

---

## 6.1 Data Flow Map — Phase 1 (POC, 100 % local)

```
Utilisateur
   │  saisit / photographie
   ▼
UI ──► Domain ──► Local Store (SQLite chiffré + fichiers chiffrés)
   │                    ▲
   │                    │ lecture pour affichage
   └──► MockAIProvider ─┘   (aucune sortie réseau)

SORTIE RÉSEAU EN PHASE 1 : AUCUNE.
Pas de télémétrie, pas de crash reporting distant, pas d'appel IA.
```

Le seul flux sortant possible est **déclenché manuellement** par l'utilisateur :
`Export ──► feuille de partage du système` (le fichier quitte l'app par un geste explicite ; l'app
avertit que la destination choisie — cloud, mail — sort de sa protection).

---

## 6.2 Data Flow Map — cible (production)

| # | Flux | Données | Chiffrement | Déclencheur | Justification |
|---|------|---------|-------------|-------------|---------------|
| F1 | UI → Local Store | Contenu documentaire, legs | AES-256-GCM local | Utilisateur | Fonction principale |
| F2 | Local Store → Local AI | Extraits de documents sélectionnés | En mémoire, jamais persisté en clair | Question de l'utilisateur | Assistance |
| F3 | App → API (auth) | Identifiants, jeton d'appareil | TLS 1.3 + pinning | Connexion | Sauvegarde/activation |
| F4 | App → Blob Service | **Blobs déjà chiffrés** + métadonnées minimales (taille, id, version) | E2EE puis TLS | Sauvegarde activée (opt-in) | Survivance des données |
| F5 | App → Metadata DB | États non sensibles (nombre de documents, statut du legs, contacts *pseudonymisés*) | TLS + chiffrement au repos | Sauvegarde activée | Restauration et activation |
| F6 | App → Notification Service | Canal du contact (email/téléphone, chiffré applicativement) | TLS | Désignation d'un contact | Notification à l'activation. **Donnée personnelle d'un tiers → information obligatoire** |
| F7 | Contact → Activation Service | Preuve de décès (acte), identité | TLS | Décès | Contrôle anti-fraude |
| F8 | Activation Service → Back-office | Dossier de demande (sans contenu de document) | TLS + accès tracé | Demande reçue | Revue humaine |
| F9 | Activation Service → Utilisateur | Contre-notification multi-canal | TLS | Demande reçue | Anti-fraude : l'utilisateur doit pouvoir s'y opposer |
| F10 | Blob Service → Contact (après validation) | **Paquet successoral scellé** (sous-ensemble choisi par l'utilisateur) | E2EE, clé libérée par le mécanisme d'activation | Validation + fin du délai | Finalité du produit |
| F11 | Services → Audit Log | Événements (qui, quoi, quand, résultat) — **sans contenu** | TLS + WORM | Continu | Traçabilité, preuve |
| F12 | Services → Observabilité | Logs techniques, métriques, traces — **sans PII** | TLS | Continu | Exploitation |
| F13 | App → Télémétrie (opt-in) | Événements produit agrégés, ID d'installation rotatif | TLS | Consentement explicite | Amélioration produit |
| F14 | App → Provider IA cloud (opt-in) | Extrait strictement nécessaire | TLS | Consentement **par requête** | Cas où l'on-device ne suffit pas |

**Flux interdits par conception :** contenu de document en clair vers le serveur ; document envoyé à
une IA distante sans consentement explicite ; PII dans les logs ou la télémétrie ; accès du
back-office au contenu.

---

## 6.3 Data Classification Map

| Classe | Définition | Exemples | Règles |
|--------|-----------|----------|--------|
| **C4 — Critique** | Compromission = perte irréversible ou dommage grave | Clés de chiffrement, clé de récupération, matériel d'activation successorale | Jamais hors du secure element, jamais loguée, jamais exportée en clair, jamais en base serveur |
| **C3 — Sensible** | Données personnelles sensibles ou à fort impact | Contenu des documents (potentiellement art. 9 RGPD), texte du legs, extraits OCR, requêtes/réponses IA | E2EE, local par défaut, jamais en clair côté serveur, jamais loguée, suppression réelle |
| **C2 — Personnelle** | Identifie une personne | Nom, email, téléphone, coordonnées du contact de confiance, identifiants de compte | Minimisation, chiffrement au repos, accès restreint, durée de conservation définie |
| **C1 — Interne** | Technique, liée à un utilisateur mais non identifiante | Identifiants opaques, statuts, versions de schéma, événements d'audit | Pseudonymisée, corrélable uniquement en interne |
| **C0 — Publique** | Sans risque | Textes d'aide, catalogue de catégories, version de l'app | Libre |

**Règle par défaut : toute nouvelle donnée est C3 tant qu'on n'a pas démontré le contraire.**

Tableau de rattachement (extrait — tenu à jour dans `docs/privacy/01-classification-donnees.md`) :

| Donnée | Classe | Où elle vit | Sort côté serveur ? |
|--------|--------|-------------|---------------------|
| Fichier de document | C3 | Appareil (+ blob chiffré si sauvegarde) | Oui, **opaque** |
| Texte du legs | C3 | Appareil (+ blob chiffré) | Oui, opaque |
| Index vectoriel / embeddings | C3 (ré-identifiants) | **Appareil uniquement** | Non |
| Email du contact de confiance | C2 (tiers) | Appareil + serveur (chiffré) | Oui, nécessaire à la notification |
| Acte de décès fourni | C2/C3 | Serveur, rétention limitée | Oui, accès revue humaine |
| Code de récupération | C4 | Utilisateur (hors app) | Jamais |
| Événement d'audit | C1 | Appareil + serveur | Oui, sans contenu |

---

## 6.4 Trust Boundary Map

```
╔═══════════════════════════════════════════════════════════════════╗
║ TB-1 — Utilisateur authentifié sur SON appareil déverrouillé      ║  confiance la plus haute
║   UI • Domain • clés dans le secure element • IA locale           ║
╚════════════════════════════╤══════════════════════════════════════╝
                             │ TB-A : verrouillage app (code/biométrie), verrouillage OS
╔════════════════════════════╧══════════════════════════════════════╗
║ TB-2 — Appareil (OS, autres applications, sauvegardes OS)         ║  NON fiable
║   Hypothèses : vol, perte, root/jailbreak, sauvegarde cloud OS    ║
╚════════════════════════════╤══════════════════════════════════════╝
                             │ TB-B : réseau public (TLS 1.3 + pinning). Tout est déjà chiffré.
╔════════════════════════════╧══════════════════════════════════════╗
║ TB-3 — Périmètre de service Veille (API, services, bases)         ║  « honnête mais curieux »
║   Hypothèse de conception : le serveur PEUT être compromis        ║
║   → il ne doit rien pouvoir lire d'utile                          ║
╚═══╤═══════════════════════════════════╤══════════════════════════╝
    │ TB-C : accès opérateur             │ TB-D : fournisseurs tiers
╔═══╧═════════════════════════╗   ╔═════╧══════════════════════════╗
║ TB-4 — Opérateurs humains   ║   ║ TB-5 — Tiers (cloud, notifs,   ║
║  MFA, JIT, double validation║   ║  stores, IA cloud opt-in)      ║
║  jamais d'accès au contenu  ║   ║  contrats art. 28, EU, audit   ║
╚═════════════════════════════╝   ╚════════════════════════════════╝
╔═══════════════════════════════════════════════════════════════════╗
║ TB-6 — Contact de confiance : HORS de toute confiance             ║
║   tant que l'activation n'est pas validée. Puis accès             ║
║   limité, temporaire, tracé, restreint au paquet prévu.           ║
╚═══════════════════════════════════════════════════════════════════╝
```

Contrôles à chaque frontière : voir `docs/security/02-trust-boundaries.md`.

---

## 6.5 Dependency Map

| Couche | Dépendance | Criticité | Risque | Mitigation |
|--------|-----------|-----------|--------|------------|
| Mobile | React Native / Expo | Haute | Rupture de version, obsolescence | Versions LTS, mises à jour planifiées, dev build maîtrisé |
| Mobile | SQLite / SQLCipher | Haute | Vulnérabilité, licence | Format ouvert, alternative possible (Realm) ; suivi CVE |
| Mobile | Keychain / Keystore (OS) | **Critique** | Dépendance matérielle, appareils anciens | Détection de capacité + dégradation documentée (refus de la fonction plutôt que baisse silencieuse de sécurité) |
| Mobile | Runtime IA on-device | Moyenne | Écosystème mouvant | Abstraction `AIProvider` (ADR-0004) |
| Mobile | Stores Apple/Google | **Critique** | Rejet, retrait, politique | Conformité aux guidelines, plan de communication |
| Backend | Cloud UE | Haute | Verrouillage, disponibilité | IaC portable, données en formats ouverts, sortie testée |
| Backend | Fournisseur email/SMS | Haute (activation) | Non-délivrance, fuite de métadonnées | Multi-canal, fournisseur UE, contenu minimal |
| CI | GitHub Actions | Haute | Compromission d'action | Épinglage par SHA, permissions minimales, OIDC |
| Toutes | Chaîne npm | **Critique** | Supply chain | Lockfile, audit, SBOM, Dependabot, revue des nouvelles dépendances |

---

## 6.6 Infrastructure Map (cible, à titre indicatif)

```
Région UE (ex. Paris)
├── Réseau : VPC privé, sous-réseaux public (LB/WAF) / privé (services) / isolé (bases)
├── Entrée : CDN/WAF → API Gateway (TLS 1.3, rate limiting)
├── Calcul : conteneurs managés (services applicatifs, autoscaling)
├── Données :
│   ├── PostgreSQL managé (metadata) — chiffré, sauvegardes chiffrées, PITR
│   ├── PostgreSQL managé (auth) — instance/schéma séparés
│   ├── Object storage (blobs opaques) — versionnage, verrou d'objet
│   └── Audit store append-only (WORM) — rétention longue
├── Secrets : KMS + gestionnaire de secrets, rotation automatique, pas de secret dans l'image
├── Observabilité : logs centralisés (rétention courte), métriques, traces, alertes → astreinte
└── Sauvegardes : chiffrées, région séparée, **restauration testée mensuellement**
```
