# ADR-0003 — Local-first, chiffrement enveloppe, clés dans le secure element

- **Statut** : Accepté — **variante navigateur en Phase 1** ([ADR-0011](0011-pwa-poc-phase-1.md))
- **Date** : 2026-09-14 · amendé le 2026-09-14
- **Phase concernée** : 1 (variante navigateur, §Variante Phase 1) puis 3 (version complète)

## Context

Veille conserve des documents parmi les plus intimes qu'une personne possède : volontés de fin de
vie, patrimoine, bulletins de salaire, documents possiblement médicaux. L'utilisateur doit rester
maître de ses données. Hypothèses de travail (`AGENTS.md` A7) : l'appareil peut être perdu, volé,
rooté, ou sauvegardé automatiquement dans un cloud grand public.

## Decision

1. **Local-first** : l'appareil est la source de vérité. Toute fonction de lecture/écriture des
   documents fonctionne hors ligne.
2. **Chiffrement enveloppe** : une DEK aléatoire par document (AES-256-GCM), encapsulée par une KEK.
3. **KEK dans le secure element** (Secure Enclave / StrongBox) via Keychain/Keystore, **non
   exportable**, déverrouillée par code applicatif ou biométrie.
4. **Clé de récupération** générée, dérivée en Argon2id, affichée une seule fois, jamais stockée par
   l'application.
5. **Chiffrement dès la Phase 1**, dans une version simple mais réelle (pas de mock de chiffrement).
6. Si le matériel ne fournit pas de secure element, **la fonction est refusée** plutôt que dégradée
   silencieusement.

Les points 3 et 6 supposent un secure element accessible, ce qu'un navigateur ne fournit pas. Ils
s'appliquent donc **à partir de la Phase 3** ; la Phase 1 suit la variante ci-dessous.

## Variante Phase 1 — navigateur (ADR-0011)

Le POC est une PWA. Ce qui est **conservé sans changement** :

- Local-first : tout fonctionne hors ligne (service worker), l'appareil reste la source de vérité.
- Chiffrement enveloppe : une DEK aléatoire par document, **AES-256-GCM** via WebCrypto, IV unique.
- Chiffrement **réel** dès le POC — aucun mock de chiffrement (point 5, inchangé).
- Suppression cryptographique : détruire la DEK rend le contenu illisible.

Ce qui **change**, et pourquoi :

| Point | Cible (Phase 3) | Phase 1 (navigateur) | Raison |
|-------|-----------------|----------------------|--------|
| KEK | Dans le secure element, non exportable | Dérivée du code applicatif par **Argon2id** (WASM), tenue en mémoire comme `CryptoKey` **non extractible**, **jamais persistée** — re-dérivée à chaque déverrouillage | Aucune API navigateur ne donne accès au secure element |
| DEK au repos | Encapsulées par la KEK matérielle | Encapsulées par la KEK dérivée, stockées chiffrées dans IndexedDB | Conséquence directe |
| Déverrouillage | Biométrie ou code | Code applicatif uniquement | Pas d'équivalent web simple en Phase 1 ; WebAuthn étudié en Phase 2 |
| Sauvegardes OS | Conteneur exclu | Sans objet | Aucune API ; atténué par le fait que la KEK n'est jamais écrite sur disque |
| Matériel insuffisant | Fonction refusée | **Sans objet** : aucune protection matérielle n'est promise en Phase 1 | Voir ci-dessous |

**Le point 6 ne peut pas s'appliquer tel quel en Phase 1** : appliqué à la lettre, il ferait refuser
l'application dans tout navigateur. Il est remplacé par une obligation de la même nature — ne jamais
laisser croire à une protection qu'on n'assure pas :

> Le POC **annonce explicitement**, à chaque démarrage, qu'il s'agit d'une version d'évaluation dont
> les clés ne sont pas protégées par du matériel, et **qu'il ne faut pas y déposer de vrais
> documents**.

C'est le même principe — *refuser plutôt que dégrader silencieusement* — appliqué à un contexte où
le refus porte sur la **promesse**, pas sur la fonction. Toute donnée réellement sensible attend la
Phase 3.

**Ce que cette variante ne protège pas**, et qu'il faut avoir en tête en lisant le threat model :
un XSS sur l'origine web peut utiliser la KEK en mémoire sans jamais la lire (risque R25). C'est la
raison d'être de la CSP stricte et de l'interdiction de toute dépendance servie par un CDN tiers.

## Alternatives

1. **Clé unique globale** pour tout chiffrer — plus simple, mais empêche le partage sélectif
   (paquet successoral) et la suppression cryptographique unitaire.
2. **Chiffrement fourni par l'OS uniquement** (protection de fichiers iOS / chiffrement Android) —
   insuffisant : ne protège pas contre l'accès applicatif ni les sauvegardes, et ne permet pas le
   partage sélectif.
3. **Clé dérivée d'un mot de passe seul** — vulnérable aux mots de passe faibles, pas de protection
   matérielle contre l'extraction hors ligne.
4. **Cloud-first chiffré côté serveur** — contraire aux principes du projet (le service pourrait lire).
5. **Pas de chiffrement en Phase 1** (« c'est un POC ») — écarté : crée des habitudes de conception
   difficiles à corriger et rend le POC inutilisable avec de vrais documents de test.

## Why

- La DEK par document est ce qui rend possible **le cœur du produit** : transmettre à un tiers un
  sous-ensemble précis de documents sans lui donner accès au reste.
- La clé non exportable rend un vol de fichiers (sauvegarde, extraction de disque) inexploitable.
- Argon2id sur la clé de récupération protège contre les attaques hors ligne.
- Refuser plutôt que dégrader : une promesse de sécurité silencieusement réduite est pire qu'une
  fonctionnalité absente.

## Trade-offs

- **Perte du code de récupération = perte définitive des données.** C'est la conséquence directe du
  zero-knowledge. Risque produit majeur, à arbitrer (décision D8).
- Gestion des DEK plus complexe (stockage, rotation, ré-encapsulage au changement de code).
- Certains appareils anciens seront exclus.
- Les données dérivées (OCR, embeddings, vignettes) doivent elles aussi être chiffrées et supprimées
  avec leur source — point régulièrement oublié, donc testé explicitement.

## Consequences

- Ports `CryptoProvider` et `SecureKeyStore` définis dans `packages/core/src/ports`. Leurs **contrats
  sont identiques** en Phase 1 et en Phase 3 : seul l'adapter change (WebCrypto puis natif).
- Tests obligatoires : aucun texte en clair sur disque, IV unique, altération détectée, suppression
  cryptographique effective, absence de clé en base ou en préférences. En Phase 1, « sur disque »
  signifie IndexedDB et OPFS, inspectés par le test.
- Test supplémentaire en Phase 1 : la KEK n'est **jamais** écrite dans IndexedDB, `localStorage`,
  `sessionStorage` ni OPFS — vérifié par inspection du stockage après déverrouillage.
- L'UI doit expliquer la clé de récupération en langage simple, et **forcer** sa mise à l'abri.
- Le schéma complet (rotation, récupération à seuil, libération de la clé successorale) est à
  spécifier et à faire **réviser par un cryptographe externe** en Phase 2.

## Revisit when

- **Passage en Phase 3** : la variante navigateur disparaît, les points 3 et 6 redeviennent la règle.
- L'extension **WebAuthn PRF** est disponible partout : une KEK dérivée d'un authentificateur
  matériel rapprocherait la Phase 1 de la cible. À évaluer en Phase 2.
- Les tests utilisateurs montrent un taux inacceptable de pertes de code de récupération.
- Une récupération à seuil (Shamir avec des proches) est retenue en Phase 2.
- Une évolution des API de sécurité des OS ouvre de meilleures options.
