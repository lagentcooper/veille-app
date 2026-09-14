# 11. Stratégie de tests

Règle AGENTS.md §9 : « Ça a l'air de marcher » n'est jamais une preuve.

---

## 11.1 Niveaux

| Niveau | Périmètre | Outil | Quand |
|--------|-----------|-------|-------|
| **Unit** | `packages/core` (règles legs, permissions, machine d'activation, sérialisation d'export) | Jest | À chaque PR, < 10 s |
| **Integration** | Adapters réels : stockage chiffré, migrations, index vectoriel, provider IA | Jest + SQLite en mémoire/fichier temporaire | À chaque PR |
| **Composant/UI** | Écrans, accessibilité, états d'erreur | React Native Testing Library | À chaque PR |
| **E2E** | 8 parcours du POC sur simulateur/émulateur | Maestro | Nightly + avant release |
| **Sécurité** | Crypto, permissions, absence de fuite, injection | Jest + règles Semgrep + tests réseau | À chaque PR sur chemins sensibles |
| **Privacy** | Absence de PII dans les logs/exports non chiffrés, consentements | Jest + scanner de motifs | À chaque PR |
| **Migration** | Schéma N→N+1, format d'export v1→v2 | Jest avec jeux de données figés | À chaque PR touchant un schéma |
| **Performance** | Import de 100 documents, recherche, latence IA | Maestro + mesures | Avant release |

---

## 11.2 Matrice fonctionnalité × type de test

| Fonctionnalité | Unit | Integration | E2E | Security | Privacy |
|----------------|------|-------------|-----|----------|---------|
| Profil local / verrouillage | ✅ règles de session | ✅ keystore | ✅ création + verrouillage | ✅ verrouillage en arrière-plan, échecs de code | ✅ aucune donnée hors appareil |
| Document de legs — rédaction | ✅ complétude, cohérence | ✅ persistance chiffrée | ✅ parcours complet | ⚪ | ✅ pas de log de contenu |
| Document de legs — validation | ✅ **règles de blocage (notaire requis)** | ✅ | ✅ écran de contrôle | ⚪ | ⚪ |
| Historique des versions | ✅ immuabilité, hash | ✅ | ✅ consultation | ✅ non-altérabilité | ⚪ |
| Import de document | ✅ validation de type/taille | ✅ chiffrement effectif | ✅ photo + fichier | ✅ **fichier malveillant, chemin, taille** | ✅ pas de nom de fichier logué |
| Consultation / recherche | ✅ filtres | ✅ index | ✅ trouver en < 15 s | ✅ pas d'accès hors périmètre | ⚪ |
| Suppression | ✅ cascade (dérivés, index, OCR) | ✅ **contenu illisible après suppression** | ✅ | ✅ suppression cryptographique | ✅ pas de résidu |
| Assistant IA | ✅ construction du contexte | ✅ provider mock/local | ✅ question → réponse citée | ✅ **prompt injection, zéro réseau, isolation inter-documents** | ✅ pas de log de prompt |
| Contact de confiance — désignation | ✅ modèle de droits | ✅ | ✅ | ✅ **aucun accès avant activation** | ✅ information du tiers |
| Contact de confiance — activation | ✅ **machine à états complète** | ✅ délais, quorum | ✅ simulation | ✅ **anti-fraude : rejet, contre-notification, révocation pendant le délai** | ✅ périmètre minimal du paquet |
| Export / portabilité | ✅ format VEA, JSON Schema | ✅ archive complète | ✅ export puis import | ✅ chiffrement de l'archive | ✅ contenu exact, rien de plus |
| Import / restauration | ✅ | ✅ **round-trip identique** | ✅ | ✅ archive falsifiée rejetée | ⚪ |
| Consentements | ✅ états | ✅ persistance | ✅ | ✅ révocation effective | ✅ granularité |
| Migrations | ✅ | ✅ N→N+1 sur données figées | ⚪ | ⚪ | ⚪ |

✅ = obligatoire · ⚪ = non pertinent à ce niveau

---

## 11.3 Tests de sécurité et privacy — contenu minimal

**Chiffrement**
- Le fichier sur disque ne contient jamais le texte en clair (recherche de motif dans les octets).
- Deux chiffrements du même contenu produisent des sorties différentes (IV aléatoire).
- Une altération d'un octet du chiffré fait échouer le déchiffrement (GCM).
- La clé n'apparaît jamais dans un dump mémoire de test, ni en base, ni dans les préférences.

**Permissions**
- Un contact « désigné » n'accède à rien : chaque méthode d'accès testée renvoie un refus.
- Chaque état de la machine d'activation est testé, y compris les transitions illégales.
- Révocation pendant le délai de carence ⇒ accès définitivement refusé.

**Prompt injection** (corpus versionné dans `packages/ai/tests/injection-corpus/`)
- Documents contenant : « ignore les instructions précédentes », instructions en base64, texte blanc
  sur fond blanc dans un PDF, instructions dans les métadonnées EXIF, contenu multilingue.
- Assertion : la réponse ne suit jamais l'instruction injectée, le `warning` est levé, aucune sortie réseau.

**Fuite de données**
- Une session complète (import, question, export) ne produit **aucune** requête sortante en Phase 1
  (interception au niveau du runtime réseau, test échoue si une requête est émise).
- Scan des logs : aucun motif email/IBAN/téléphone/NIR.
- L'export non chiffré ne contient que ce que l'utilisateur a demandé.

**Restauration**
- Export → réinstallation propre → import → l'état est identique (comparaison structurelle).
- Test mensuel en Phase 3+ sur les sauvegardes serveur.

---

## 11.4 Critères de qualité

- Couverture **du domaine** (`packages/core`) : ≥ 90 % de lignes, 100 % des règles de validité et de
  permission. La couverture UI n'est pas un objectif chiffré.
- Aucun test désactivé sans ticket lié et commentaire.
- Chaque bug corrigé ⇒ test de non-régression dans le même commit.
- Les tests ne doivent contenir **aucune donnée réelle** : jeux générés par `tools/seed`.
