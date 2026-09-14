# ADR-0003 — Local-first, chiffrement enveloppe, clés dans le secure element

- **Statut** : Accepté
- **Date** : 2026-09-14
- **Phase concernée** : 1 (version simplifiée) puis 3 (version complète)

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

- Ports `CryptoProvider` et `SecureKeyStore` définis dans `packages/core/src/ports`.
- Tests obligatoires : aucun texte en clair sur disque, IV unique, altération détectée, suppression
  cryptographique effective, absence de clé en base ou en préférences.
- L'UI doit expliquer la clé de récupération en langage simple, et **forcer** sa mise à l'abri.
- Le schéma complet (rotation, récupération à seuil, libération de la clé successorale) est à
  spécifier et à faire **réviser par un cryptographe externe** en Phase 2.

## Revisit when

- Les tests utilisateurs montrent un taux inacceptable de pertes de code de récupération.
- Une récupération à seuil (Shamir avec des proches) est retenue en Phase 2.
- Une évolution des API de sécurité des OS ouvre de meilleures options.
