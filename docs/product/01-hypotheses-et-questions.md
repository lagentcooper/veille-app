# 1. Hypothèses de travail et questions critiques

> Document vivant. Toute réponse apportée par le porteur du projet doit être reportée ici
> puis, si elle est structurante, transformée en ADR.

Les hypothèses ci-dessous sont celles sur lesquelles **toute l'architecture proposée repose**.
Si l'une d'elles est fausse, l'architecture change. Elles sont classées par impact.

---

## 1.1 Hypothèses à impact **majeur** (invalider = redessiner)

| # | Hypothèse retenue | Impact si fausse |
|---|-------------------|------------------|
| H1 | **Droit applicable : France.** Les utilisateurs sont résidents français et le document de legs relève du Code civil français. | Le moteur de validité, les mentions légales et le modèle de preuve changent entièrement (Belgique, Suisse, Québec ont des régimes différents). |
| H2 | **Veille ne produit pas un testament juridiquement valide par voie numérique.** Elle produit un *document de volontés* + un guide de mise en forme manuscrite (voir §juridique). | Si l'on prétend produire un testament valide, risque juridique et de réputation majeur, et exigences de preuve/horodatage/archivage qualifié très lourdes. |
| H3 | **L'utilisateur est propriétaire de ses clés ; le service ne peut pas lire ses documents (zero-knowledge par défaut).** | Si le serveur doit pouvoir déchiffrer (récupération de compte facile, indexation serveur), le threat model, la conformité et la promesse produit changent radicalement. |
| H4 | **La personne de confiance n'a aucun accès avant activation.** | Tout autre choix (accès anticipé en lecture) crée un risque d'abus et impose un modèle de consentement et d'audit très différent. |
| H5 | **Phase 1 = 100 % local, sans backend, sans compte distant.** | Un backend dès la Phase 1 multiplie le coût, le délai, et la surface de conformité avant même d'avoir validé le produit. |
| H6 | **Le mobile est la plateforme principale** (iOS + Android), pas le web. | Le chiffrement local, le stockage sécurisé matériel et l'IA on-device ne se transposent pas tels quels au web. |

---

## 1.2 Hypothèses à impact **moyen**

| # | Hypothèse | Note |
|---|-----------|------|
| H7 | Volume par utilisateur modeste : < 500 documents, < 2 Go. | Dimensionne le stockage local, l'index vectoriel et l'export. |
| H8 | Équipe réduite (1 à 5 personnes), budget contraint. | Justifie monorepo, managed services, pas de microservices. |
| H9 | Utilisateurs plutôt âgés / non technophiles. | Accessibilité (tailles de police, contrastes, parcours courts) = exigence produit, pas option. |
| H10 | Appareils récents (iOS 16+ / Android 10+, 64-bit). | Nécessaire pour Secure Enclave/StrongBox et IA on-device. |
| H11 | Les documents importés peuvent contenir des **données sensibles au sens de l'art. 9 RGPD** (documents médicaux, appartenance syndicale…) même si le produit ne les demande pas. | Impose de traiter tout document comme potentiellement sensible. ⚖️ Impact hébergement (HDS) à valider. |
| H12 | Pas d'exigence temps réel, pas de collaboration multi-utilisateurs simultanée. | Simplifie énormément la synchronisation (pas de CRDT nécessaire au départ). |

---

## 1.3 Questions critiques — **bloquantes avant la Phase 2**

### Juridique & produit

1. **Quelle juridiction cible au lancement ?** (France seule ? France + Belgique + Suisse ?)
   Cela conditionne le moteur de règles de validité et les mentions obligatoires.
2. **Le document produit est-il présenté comme :**
   (a) un *brouillon de testament olographe* à recopier à la main,
   (b) un *document de volontés* non testamentaire (funérailles, mots aux proches, inventaire),
   (c) les deux, clairement séparés ?
   → **Recommandation : (c), avec séparation stricte dans l'UI.**
3. **Un partenariat notarial est-il envisagé** (dépôt au Fichier Central des Dispositions de Dernières Volontés) ? Cela change la proposition de valeur et le modèle de preuve.
4. **Quelle preuve de décès est acceptée**, et **qui la valide** ? (acte de décès + revue humaine ? tiers de confiance ? notaire ?)
5. **Qui porte la responsabilité** en cas d'activation frauduleuse ? Quelle assurance RC professionnelle ?
6. **Modèle économique** (gratuit, abonnement, one-shot) : il conditionne la faisabilité d'un stockage serveur et d'une revue humaine des activations.

### Technique & sécurité

7. **Que se passe-t-il si l'utilisateur perd son téléphone ET son code de récupération ?**
   Zero-knowledge signifie **perte définitive**. Est-ce acceptable produit ? (Alternative : sauvegarde chiffrée avec récupération assistée → renonce au zero-knowledge strict.)
8. **Le contenu doit-il survivre à l'appareil ?** Si oui, une sauvegarde chiffrée distante devient obligatoire dès la Phase 3, et le transfert vers la personne de confiance devient possible sans l'appareil du défunt. Si non, l'appareil perdu = tout est perdu, y compris pour les héritiers → **contradiction probable avec la finalité du produit**.
   → Question **la plus structurante de tout le projet**.
9. **Délai de carence d'activation** acceptable (7, 15, 30 jours) et canaux de contre-notification ?
10. **Plusieurs personnes de confiance / quorum (M sur N)** dès le départ, ou une seule ?
11. **Hébergement** : UE obligatoire ? Souveraineté (Scaleway/OVH) exigée ou AWS/GCP UE acceptable ? ⚖️ Question HDS si documents de santé.
12. **Niveau d'IA visé** : résumé/extraction simple (petit modèle on-device suffisant) ou raisonnement (nécessite un modèle plus gros, donc contraintes matérielles fortes, voire cloud) ?

### Organisation

13. Qui sont les **CODEOWNERS** (sécurité, mobile, IA) ?
14. Existe-t-il un **DPO** ou un conseil juridique identifié ?
15. Cible de mise en production (date, marché, volume) ?

---

## 1.4 Ambiguïtés relevées dans la demande initiale

| Ambiguïté | Interprétation retenue pour l'instant |
|-----------|---------------------------------------|
| « Personne de confiance » | En droit français, l'expression désigne un rôle **médical** (art. L1111-6 CSP). Pour éviter la confusion, **le libellé UI sera différent** (ex. « Contact de confiance » / « Exécuteur désigné »). Voir `docs/product/02-contraintes-juridiques.md`. |
| « Document de legs » | Traité comme *déclaration de volontés* structurée + guide vers un testament valide. Pas de prétention de validité automatique. |
| « IA locale » | On-device par défaut, `MockAIProvider` en Phase 1, provider cloud **optionnel et opt-in** plus tard. |
| « Monorepo GIT » (section 6 de la demande) | Lu comme une préférence à instruire, pas comme une décision acquise → comparaison faite et décision documentée en ADR-0001 (qui conclut malgré tout au monorepo). |
| « Chiffrés » pour les documents | Chiffrement **au repos sur l'appareil dès la Phase 1** (pas seulement en production). |
| « Décès ou incapacité » | Deux procédures **distinctes** : l'incapacité est bien plus difficile à prouver et plus risquée. Voir ADR-0005. |
