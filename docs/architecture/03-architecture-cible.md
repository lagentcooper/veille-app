# 5. Architecture cible (production, Phase 3+)

> Rien de ce document n'est à construire en Phase 1. Il existe pour garantir que les choix du POC
> (ports/adapters, format d'export, modèle de permissions) mènent **quelque part**.

---

## 5.1 Diagramme logique

```
┌──────────────────────────── APPAREIL DE L'UTILISATEUR (zone de confiance principale) ────────────────────────────┐
│                                                                                                                 │
│   UI (React Native)                                                                                             │
│     │                                                                                                           │
│   Domain (règles legs, permissions, états d'activation)                                                         │
│     │                                                                                                           │
│   ┌──────────────┬──────────────────┬─────────────────┬──────────────────┬─────────────────┐                    │
│   ▼              ▼                  ▼                 ▼                  ▼                 ▼                    │
│ Local Store   Local Crypto      Local AI          Key Manager       Consent/Audit     Sync Client               │
│ (SQLCipher +  (AES-256-GCM,     (LLM on-device,   (Secure Enclave /  local           (chiffre AVANT             │
│  fichiers     enveloppe DEK/KEK) embeddings,       StrongBox,        (append-only)    d'émettre)                │
│  chiffrés)                       OCR, sqlite-vec)  Keychain)                                                    │
└───────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘
                                                    │  TLS 1.3 + pinning ; charge utile DÉJÀ chiffrée (E2EE)
                                                    ▼
                                          ┌───────────────────┐
                                          │   API Gateway     │  WAF, rate limiting, mTLS interne,
                                          │                   │  validation de schéma, pas de log de corps
                                          └─────────┬─────────┘
                                    ┌───────────────┴────────────────┐
                                    ▼                                ▼
                        ┌───────────────────────┐        ┌────────────────────────────────┐
                        │  Identity / Auth      │        │   Application Services         │
                        │  (OIDC, MFA,          │        │   ┌──────────┬──────────────┐  │
                        │   device binding,     │        │   │ Account  │ Legacy /     │  │
                        │   session mgmt)       │        │   │ Service  │ Activation   │  │
                        └──────────┬────────────┘        │   ├──────────┼──────────────┤  │
                                   │                     │   │ Blob     │ Notification │  │
                                   │                     │   │ Service  │ Service      │  │
                                   │                     │   └──────────┴──────────────┘  │
                                   │                     └───────┬──────────┬─────────────┘
                                   │                             │          │
        ┌──────────────────────────┼─────────────────┬───────────┴──┬───────┴───────────┬─────────────────┐
        ▼                          ▼                 ▼              ▼                   ▼                 ▼
┌───────────────┐        ┌──────────────────┐ ┌────────────┐ ┌──────────────┐  ┌────────────────┐ ┌────────────┐
│ Auth DB       │        │ Metadata DB      │ │ Document   │ │ Audit Log     │  │ Secrets / KMS  │ │ Observabi- │
│ (identités,   │        │ (comptes, états, │ │ Blob Store │ │ (append-only, │  │ (clés service, │ │ lité       │
│  MFA, devices)│        │  pas de contenu) │ │ (opaque,   │ │  chaîné par   │  │  JAMAIS les    │ │ (logs sans │
│               │        │                  │ │  chiffré)  │ │  hash, WORM)  │  │  clés user)    │ │  PII)      │
└───────────────┘        └──────────────────┘ └────────────┘ └──────────────┘  └────────────────┘ └────────────┘
        ▲                                                              ▲
        │                                                              │
┌───────┴────────────────┐                                    ┌────────┴─────────────────┐
│ Back-office de revue   │  ── humains habilités, MFA, 4 yeux  │ Alerting / SIEM         │
│ (activations décès)    │      accès tracé, jamais au contenu │                          │
└────────────────────────┘                                    └──────────────────────────┘
```

### Adaptation par rapport au schéma initial proposé

Trois écarts **volontaires** par rapport au diagramme du cahier des charges :

1. **Le Document Storage ne contient que des blobs opaques.** Le serveur ne détient jamais les clés
   de contenu. Il stocke des octets sans signification pour lui (ADR-0010).
2. **Ajout d'un service « Legacy/Activation » isolé** avec sa propre base d'états et son back-office :
   c'est le composant le plus sensible du produit (fraude, usurpation) ; il ne doit pas être noyé
   dans un service applicatif générique.
3. **Ajout explicite d'un Key Management côté appareil** distinct du KMS serveur : deux mondes de
   clés qui ne se rencontrent jamais.

---

## 5.2 Responsabilités des composants

| Composant | Responsabilité | Ne fait jamais |
|-----------|----------------|----------------|
| **UI** | Présentation, accessibilité, consentements | Aucune règle métier, aucun accès direct au stockage |
| **Domain (mobile)** | Validité du legs, versions, permissions, machine d'activation | Aucun appel réseau direct |
| **Local Store** | Persistance chiffrée (base + fichiers) | Stocker en clair, stocker des clés |
| **Local Crypto** | Chiffrement enveloppe, hash, signatures | Inventer des primitives |
| **Key Manager** | Génération/stockage/rotation des clés dans le matériel | Exporter une clé privée hors du secure element |
| **Local AI** | Embeddings, RAG, OCR, génération | Sortir du contenu de l'appareil |
| **Sync Client** | Sauvegarde chiffrée, transfert de paquets scellés | Envoyer quoi que ce soit en clair |
| **API Gateway** | TLS, authn, rate limiting, validation de schéma, corrélation | Logger un corps de requête |
| **Identity/Auth** | Comptes, MFA, sessions, liaison d'appareil | Détenir des clés de contenu |
| **Account Service** | Cycle de vie du compte, abonnement, suppression | Lire un document |
| **Blob Service** | Stockage/versionnage d'objets opaques, intégrité | Déchiffrer |
| **Legacy/Activation Service** | Machine à états de l'activation, preuves, délais, notifications, quorum | Décider seul (revue humaine obligatoire) |
| **Notification Service** | Emails/SMS/push transactionnels | Contenir des données de document |
| **Audit Log** | Journal inaltérable chaîné par hash | Contenir une PII non nécessaire |
| **Back-office** | Revue humaine des activations | Accéder au contenu des documents |

---

## 5.3 Séparation stricte des données (exigence du cahier des charges)

| Domaine de données | Stockage dédié | Chiffrement | Accès |
|--------------------|----------------|-------------|-------|
| Données utilisateur (profil, états) | Metadata DB | Au repos (TDE) + champs sensibles chiffrés applicativement | Services applicatifs, jamais back-office par défaut |
| Documents (contenu) | Blob Store | **E2EE** (clé utilisateur) | Personne côté serveur |
| Secrets techniques | KMS / gestionnaire de secrets | Géré par le KMS | Services, via identité machine, rotation automatique |
| Logs applicatifs | Stack d'observabilité | Au repos | SRE, rétention courte |
| Métriques | TSDB | Non sensible par construction | Équipe |
| Audit | Audit store append-only (WORM) | Au repos + chaînage par hash | Lecture seule, exportable |
| Données IA | **Appareil uniquement** (index vectoriel local) | Local | Utilisateur seul |
| Authentification | Auth DB isolée | Hash Argon2id, secrets MFA chiffrés | Service Identity seul |

Aucune base ne mélange deux de ces domaines. Aucun service n'a d'accès en lecture à une base d'un autre domaine (un service = un rôle DB = un schéma).

---

## 5.4 Environnements

| Environnement | Données | Accès | Particularités |
|---------------|---------|-------|----------------|
| **dev** | Fictives uniquement (générées) | Équipe | Pas de secret de production, aucune donnée réelle jamais |
| **test/CI** | Fictives, éphémères | Automatisé | Isolé, sans accès sortant non nécessaire |
| **staging** | Fictives, iso-prod en structure | Équipe restreinte, MFA | Même IaC que prod, tests de restauration et de migration |
| **production** | Réelles | Minimal, MFA + accès just-in-time, tracé | Approbation manuelle pour déployer, rollback testé |

**Interdiction absolue : jamais de copie de données de production vers un autre environnement.**
Les jeux de test sont **générés**, pas anonymisés depuis la prod.
