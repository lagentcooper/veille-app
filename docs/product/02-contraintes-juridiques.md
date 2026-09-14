# 2. Contraintes juridiques structurantes (hypothèse : droit français)

> ⚖️ **VALIDATION JURIDIQUE REQUISE SUR L'INTÉGRALITÉ DE CE DOCUMENT.**
> Rédigé par un architecte logiciel, **pas** par un juriste. Ce document sert à **cadrer la
> conception et à éviter des impasses techniques**, pas à donner un avis juridique.
> Rien ici ne doit être affiché tel quel à un utilisateur.

Ce document existe parce que **les contraintes juridiques déterminent l'architecture** :
elles décident de ce que le produit peut promettre, de ce qu'il doit stocker, et de qui valide quoi.

---

## 2.1 Le point le plus important : un testament numérique n'est pas valide

En droit français, les formes de testament sont limitativement énumérées. Les deux formes usuelles :

| Forme | Exigences (résumé non juridique) | Conséquence pour Veille |
|-------|----------------------------------|--------------------------|
| **Testament olographe** (art. 970 C. civ.) | Écrit **en entier à la main** par le testateur, **daté**, **signé** de sa main. | Un document saisi sur téléphone, même signé électroniquement, **n'est pas** un testament olographe. |
| **Testament authentique** (art. 971 s.) | Reçu par notaire, avec témoins/second notaire. | Hors du périmètre d'une application. |

**Conséquence architecturale majeure :**

> Veille **ne génère pas un testament valide**. Elle génère :
> 1. un **document de volontés** structuré (utile, mais sans force testamentaire en tant que tel), et
> 2. un **document d'aide à la rédaction manuscrite** : le texte à recopier à la main, avec les
>    mentions et la marche à suivre, et l'orientation vers un notaire.

Le produit doit donc gérer **deux objets distincts** dans le modèle de données :

- `WillDraft` — brouillon destiné à être **recopié à la main** puis conservé physiquement.
- `WishesDocument` — volontés non testamentaires (funérailles, messages aux proches, inventaire de
  biens et de comptes, emplacement des papiers, mots de passe... — voir §2.4 pour les limites).

Et un troisième état, purement déclaratif : `PhysicalWillRecord` — l'utilisateur déclare **où se
trouve** le testament manuscrit signé (et éventuellement s'il est déposé chez un notaire / inscrit au
Fichier Central des Dispositions de Dernières Volontés).

**Formulation UI obligatoire** (à faire valider) : ne jamais écrire « votre testament est valide »,
mais « votre document est complet selon la checklist » + rappel systématique du recours au notaire.

---

## 2.2 Limites à afficher explicitement (cas nécessitant un professionnel)

Le moteur de validation doit **détecter et signaler** au minimum les situations suivantes, en
orientant vers un notaire ou un avocat — sans prétendre les résoudre :

- Présence d'**héritiers réservataires** (enfants, à défaut conjoint) → la quotité disponible limite
  la liberté de disposer. Le logiciel **ne calcule pas** la réserve : il **alerte**.
- Biens **immobiliers**, entreprise, parts sociales, exploitation agricole.
- **Élément d'extranéité** (bien à l'étranger, résidence hors de France, nationalité étrangère) →
  règlement européen sur les successions, conflits de lois.
- Régimes matrimoniaux, PACS, donation entre époux, assurance-vie (hors succession).
- Legs à une association / fondation, à une personne morale.
- Enfant mineur, majeur protégé (tutelle/curatelle), situation d'incapacité du testateur.
- Recomposition familiale, enfants d'unions différentes.
- Volontés relatives au **corps** (don d'organes, don du corps) → régimes spécifiques.
- Toute clause conditionnelle ou de charge.

**Règle produit :** ces détections sont des **avertissements bloquants à l'étape de validation**
(« vous devez consulter un professionnel »), pas de simples infobulles.

---

## 2.3 « Personne de confiance » : collision de vocabulaire

En droit français, la **personne de confiance** (art. L1111-6 du Code de la santé publique) est un
rôle **médical** (accompagnement, expression des volontés en fin de vie), désigné par écrit, et qui
n'a **aucun pouvoir successoral**.

Le rôle voulu dans Veille (déclencher une procédure au décès, accéder à un paquet de documents) est
plus proche d'un **exécuteur testamentaire** (art. 1025 s. C. civ.) — lequel, juridiquement, **doit
être désigné dans le testament lui-même**, pas dans une application.

**Décisions produit proposées :**

1. Utiliser dans l'UI un libellé neutre : **« Contact de confiance »** (rôle *applicatif*), et
   expliquer clairement qu'il ne s'agit **ni** de la personne de confiance médicale, **ni** d'un
   exécuteur testamentaire au sens légal.
2. Si l'utilisateur veut un véritable exécuteur testamentaire, le guider vers la rédaction manuscrite
   et le notaire.
3. Dans le code, le domaine s'appelle `trustedContact` (jamais `trustedPerson` qui induit la
   confusion avec le rôle CSP).

⚖️ À valider : le libellé exact et la formulation de l'avertissement.

---

## 2.4 Risques spécifiques : fraude, usurpation, preuve

| Risque | Description | Mitigation architecturale (voir ADR-0005) |
|--------|-------------|--------------------------------------------|
| **Activation frauduleuse** | Un tiers déclare faussement le décès pour obtenir l'accès. | Preuve documentaire + revue humaine + **délai de carence** + contre-notification multi-canal à l'utilisateur + journal d'audit inaltérable. |
| **Usurpation du contact de confiance** | Quelqu'un se fait passer pour le contact désigné. | Enrôlement préalable du contact avec vérification d'identité au moment de l'activation (pas avant), lien d'activation à usage unique, second facteur. |
| **Incapacité alléguée** | Bien plus difficile à prouver qu'un décès et plus facilement abusée (personne vivante et lésée). | ⚖️ **Recommandation : ne pas implémenter l'activation pour incapacité avant validation juridique.** Exiger a minima une décision judiciaire de protection (tutelle/curatelle) ou un certificat médical circonstancié, avec revue humaine renforcée. |
| **Contestation successorale** | Les héritiers contestent le contenu ou la date. | Versioning horodaté, journal d'audit signé, export vérifiable — **sans jamais prétendre valoir preuve légale**. |
| **Mot de passe / secrets stockés** | Stocker des identifiants bancaires ou mots de passe « pour les héritiers » crée un risque et pose des questions de licéité d'accès aux comptes. | Fortement déconseillé en v1 : proposer d'indiquer *où* se trouvent les papiers, pas de stocker des identifiants. ⚖️ À arbitrer. |
| **Données post-mortem** | En France, la loi permet de définir des **directives relatives au sort des données après la mort** (art. 85 loi Informatique et Libertés). | Opportunité produit : Veille peut être l'outil de ces directives. ⚖️ Conditions à valider. |

---

## 2.5 RGPD — ce qui est déjà certain et ce qui ne l'est pas

**Certain (et à concevoir dès maintenant) :**
- Veille traite des données personnelles, très probablement **sensibles** (art. 9) via les documents importés.
- Les droits d'accès, rectification, effacement, **portabilité** doivent être techniquement réalisables → cf. `docs/privacy/02-export-portabilite-suppression.md`.
- Privacy by Design / by Default sont des **obligations** (art. 25), pas des options.
- Une **AIPD/DPIA** sera requise (traitement à grande échelle de données sensibles, données de personnes vulnérables) — à réaliser avant la Phase 3.
- Registre des traitements, politique de conservation, information des personnes, sous-traitants (art. 28).

**Non tranché (⚖️ validation requise) :**
- Qualification exacte du responsable de traitement en Phase 1 (100 % local : arguable que l'éditeur ne traite aucune donnée, mais l'analyse doit être écrite).
- Nécessité d'un hébergeur certifié **HDS** si des documents de santé sont stockés côté serveur, même chiffrés de bout en bout.
- Base légale de la transmission au contact de confiance après décès (les données d'une personne décédée ne sont plus « données personnelles » au sens strict, mais celles des tiers mentionnés dans les documents le restent).
- Durées de conservation applicables.

**Interdit dans toute communication ou documentation :** écrire que le produit « est conforme RGPD ».
On écrit : « conçu pour faciliter la conformité, sous réserve d'analyse juridique ».

---

## 2.6 AI Act (UE)

Analyse préliminaire, ⚖️ à valider :

- Une fonction d'assistance qui **explique/résume des documents personnels** relève *a priori* du
  risque **limité/minimal**, avec obligations principales de **transparence** : l'utilisateur doit
  savoir qu'il interagit avec une IA, et les contenus générés doivent être identifiables comme tels.
- Le risque monte si le produit évolue vers du **conseil juridique automatisé** ou vers une
  **évaluation de personnes** → éviter par conception ; c'est une raison de plus pour ne pas laisser
  l'IA produire du conseil.
- Obligations de transparence à implémenter dès le POC (coût nul, bénéfice immédiat) :
  mention « réponse générée par une IA », indication du modèle utilisé et de sa localisation
  (local/distant), possibilité de désactiver l'IA.
- Documentation technique du système IA à tenir dès la Phase 3 (`docs/architecture/05-ia-locale.md`).

---

## 2.7 Décisions produit déduites (à confirmer)

1. Séparer strictement **brouillon de testament** et **document de volontés**.
2. Ne jamais afficher un statut « valide » : afficher « complet / incomplet selon notre checklist ».
3. Afficher un **avertissement permanent et non masquable** sur l'écran du document de legs.
4. Le parcours se **termine** par une étape « faire valider / déposer chez un notaire » présentée
   comme la bonne pratique, pas comme une option marginale.
5. Ne pas implémenter l'activation pour **incapacité** dans les premières versions.
6. Ne pas stocker d'identifiants/mots de passe de comptes tiers en v1.
