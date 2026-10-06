# 16. Roadmap

Pour chaque phase : **objectifs · livrables · critères d'acceptation · risques · dépendances · ce qui
ne doit PAS encore être développé.**

Les durées sont indicatives pour une équipe de 1 à 3 personnes et doivent être recalées.

---

## Phase 0 — Cadrage (en cours, cette session)

**Objectifs** — poser une architecture et des règles permanentes permettant à plusieurs sessions de
travailler sans perte de contexte.

**Livrables** — `AGENTS.md`, `docs/architecture/*`, `docs/security/*`, `docs/privacy/*`,
`docs/product/*`, ADR 0001–0010, `docs/progress.md`.

**Critères d'acceptation**
- [ ] Un nouvel intervenant peut reprendre le projet avec le seul repository.
- [ ] Chaque décision structurante a un ADR (Décision → Pourquoi → Alternative → Trade-off).
- [ ] Les questions bloquantes sont listées et assignées.
- [ ] **Validation explicite de l'architecture par le porteur du projet.**

**Risques** — architecture validée « par défaut » sans être lue ; hypothèses juridiques fausses (H1, H2).

**Ne PAS faire** — écrire du code applicatif.

---

## Phase 1 — POC UX/UI local (≈ 4 à 6 semaines)

**Objectifs** — valider le produit auprès de vrais utilisateurs (dont des personnes non technophiles
et âgées) avant d'investir dans l'infrastructure.

**Livrables**
1. Squelette monorepo (`apps/mobile`, `packages/{core,ui,ai,config}`) + CI minimale.
2. Design system de base (`packages/ui`) : accessibilité, typographie, composants.
3. Les 8 parcours de `docs/architecture/02-mobile-poc.md` §4.3, navigables de bout en bout.
4. `packages/core` : règles de complétude du legs, modèle de permissions, machine d'activation (simulée).
5. Chiffrement local réel (simple) + verrouillage par code/biométrie.
6. `MockAIProvider` + UX de l'assistant avec citations et badge « traitement local ».
7. Export/import VEA fonctionnel (au moins en clair + chiffré par mot de passe).
8. Jeu de données fictives (`tools/seed`).
9. Tests : domaine, composants, 8 parcours E2E Maestro.
10. **Compte rendu de tests utilisateurs** (≥ 5 personnes, dont ≥ 2 de plus de 65 ans).

**Critères d'acceptation**
- [ ] ≥ 80 % des testeurs terminent la création du document de legs **sans aide**.
- [ ] Les testeurs expliquent correctement, avec leurs mots, ce que peut voir le contact de confiance.
- [ ] Aucune requête réseau émise (test automatisé).
- [ ] Aucun contenu en clair sur le disque (test automatisé).
- [ ] Export → réinstallation → import : état identique.
- [ ] Aucune PII dans les logs (test automatisé).
- [ ] CI verte : lint, typecheck, tests, gitleaks.

**Risques** — le POC part en production « parce qu'il marche » (⇒ bandeau « version d'évaluation » et
refus explicite de publier) ; la complexité juridique dégrade l'UX ; l'attente d'une IA « ChatGPT ».

**Dépendances** — réponses aux questions produit 1 à 3 ; recrutement des testeurs.

**Ne PAS faire** — backend, compte distant, synchronisation, vraie IA, vraie activation
successorale, RBAC, publication sur les stores, optimisation de performance.

---

## Phase 2 — Architecture, sécurité, conformité (≈ 4 à 6 semaines, partiellement en parallèle)

**Objectifs** — transformer les principes en spécifications exécutables, **avant** d'écrire le backend.

**Livrables**
1. Spécification cryptographique complète (schéma de clés, rotation, récupération, **libération de la
   clé du paquet successoral**) + revue externe.
2. Spécification détaillée de l'activation : preuves, délais, quorum, contre-notification, abuse cases.
3. Threat model approfondi + plan de tests de sécurité.
4. AIPD/DPIA, registre des traitements, politique de conservation, mentions d'information.
5. Avis juridique écrit sur les points ⚖️ (`docs/product/02-contraintes-juridiques.md`).
6. Spécification d'API (OpenAPI) et modèle de données serveur.
7. Choix d'hébergement + architecture d'infrastructure cible.
8. Spécification VEA v1 figée et publiée.

**Critères d'acceptation**
- [ ] Un cryptographe externe a revu le schéma et ses réserves sont traitées.
- [ ] Un juriste a rendu un avis écrit sur la nature du document et la procédure d'activation.
- [ ] Chaque flux de données a une finalité, une base légale et une durée.
- [ ] Tout risque critique du threat model a une mitigation **ou** est explicitement accepté par écrit.

**Risques** — l'avis juridique invalide une hypothèse majeure (prévoir un point d'arrêt) ; paralysie
par excès d'analyse (timeboxer).

**Dépendances** — Phase 1 validée ; juriste et cryptographe identifiés et financés.

**Ne PAS faire** — coder le backend, provisionner de l'infrastructure de production, choisir des
fournisseurs définitifs.

---

## Phase 3 — Développement production (≈ 3 à 5 mois)

**Objectifs** — construire la version réellement utilisable avec de vraies données.

**Livrables** — SQLCipher + secure element + rotation ; IA on-device réelle (OCR, embeddings, RAG,
génération) ; backend (auth, blobs, métadonnées) ; service d'activation + back-office de revue ;
sauvegarde chiffrée et restauration ; IaC (dev/staging/prod) ; observabilité et audit ; pipeline de
release mobile.

**Critères d'acceptation**
- [ ] Le serveur, compromis en environnement de test, ne livre aucun contenu lisible (démontré).
- [ ] Tous les tests de la matrice passent, y compris prompt injection et fuite de données.
- [ ] Restauration complète depuis une sauvegarde : réussie et chronométrée.
- [ ] Aucun secret hors du gestionnaire de secrets ; rotation démontrée.
- [ ] Migration Phase 1 → Phase 3 des données testée (les testeurs ne perdent rien).

**Risques** — IA on-device décevante sur appareils moyens (prévoir le repli) ; complexité de
l'activation sous-estimée (c'est le composant le plus risqué : le développer **en premier**) ;
dérive de périmètre.

**Dépendances** — Phase 2 validée, avis juridique rendu, hébergeur choisi.

**Ne PAS faire** — fonctionnalités non validées en Phase 1, multi-plateforme web, partage social,
provider IA cloud (sauf décision explicite).

---

## Phase 4 — Tests de sécurité et conformité (≈ 4 à 8 semaines)

**Objectifs** — obtenir des preuves externes avant d'exposer de vraies données.

**Livrables** — pentest externe (mobile, API, **logique d'activation**) ; audit du schéma
cryptographique ; DAST + MobSF ; campagne d'accessibilité ; revue de conformité RGPD/AI Act par un
juriste ; exercice de restauration et de reprise ; plan de réponse à incident testé.

**Critères d'acceptation**
- [ ] Aucune vulnérabilité critique ou haute ouverte.
- [ ] Tentative de fraude à l'activation simulée : **détectée et bloquée**.
- [ ] Accessibilité validée avec des utilisateurs réels (VoiceOver/TalkBack).
- [ ] Procédure d'incident jouée en conditions réelles.

**Risques** — découverte tardive d'un défaut de conception (⇒ revue externe dès la Phase 2) ; délais
et coûts du pentest.

**Ne PAS faire** — publier avec des vulnérabilités « acceptées temporairement » sur l'activation ou la crypto.

---

## Phase 5 — Mise en production (≈ 4 semaines)

**Objectifs** — lancer avec un risque maîtrisé.

**Livrables** — publication sur les stores, déploiement progressif, monitoring et astreinte,
sauvegardes automatiques vérifiées, runbooks, support utilisateur, documents légaux publiés
(CGU, politique de confidentialité, mentions sur les limites juridiques).

**Critères d'acceptation**
- [ ] Rollback testé (application et base).
- [ ] Alertes branchées sur une astreinte réelle.
- [ ] Restauration de sauvegarde testée en production.
- [ ] Parcours de support défini pour un utilisateur ayant perdu son code de récupération.
- [ ] Lancement progressif (cohorte limitée) avant ouverture générale.

**Risques** — refus des stores (justifier les fonctions de chiffrement, conformité export ⚖️) ;
afflux de support ; premier incident sans procédure rodée.

**Ne PAS faire** — ouvrir à tous immédiatement ; promettre une conformité non auditée.

---

## Phase 6 — Maintenance et évolution (continu)

**Objectifs** — durer, sans dégrader la sécurité ni la confiance.

**Livrables** — patch management et mises à jour de dépendances ; rotation régulière des secrets ;
revue trimestrielle du threat model ; réexamen annuel de l'AIPD ; évolution des modèles IA ;
nouveaux parcours (multi-contacts, quorum, directives post-mortem) ; **plan de fin de service**
(si Veille s'arrête, les utilisateurs doivent pouvoir récupérer leurs données — engagement à écrire
dès maintenant).

**Critères d'acceptation permanents**
- [ ] Aucune vulnérabilité critique ouverte > 7 jours.
- [ ] Restauration testée chaque mois.
- [ ] Chaque incident donne lieu à un post-mortem sans recherche de faute.
- [ ] Chaque nouvelle fonctionnalité passe la DoD de `AGENTS.md` §11.
