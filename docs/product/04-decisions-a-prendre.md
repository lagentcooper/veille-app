# 17. Décisions à prendre avant de commencer le développement

Chaque ligne : **qui décide**, **impact si on ne décide pas**, **recommandation de l'architecte**.
Les décisions marquées 🔴 sont **bloquantes** pour la Phase 1.

> **État au 2026-09-14** : le porteur a validé l'architecture (D22) et tranché la plateforme du POC
> (D16 → PWA, [ADR-0011](../decisions/0011-pwa-poc-phase-1.md)). La Phase 1 est ouverte. Les
> décisions 🔴 restantes — D1, D2, D3, D8, D9, D25 — restent à trancher ; elles conditionnent le
> contenu des parcours, pas le démarrage du squelette applicatif.

---

## 17.1 Produit et juridique

| # | Décision | Bloquant | Recommandation | Impact si reportée |
|---|----------|----------|----------------|--------------------|
| D1 | **Juridiction cible** (France seule ?) | 🔴 | France seule au lancement | Le moteur de règles de validité est à refaire |
| D2 | **Nature du document produit** : brouillon de testament à recopier / document de volontés / les deux | 🔴 | **Les deux, strictement séparés** dans l'UI et le modèle | Risque juridique majeur et refonte de parcours |
| D3 | Libellé du rôle « personne de confiance » | 🔴 | « Contact de confiance », avec avertissement distinguant le rôle médical (CSP) et l'exécuteur testamentaire | Confusion utilisateur et risque juridique |
| D4 | Activation pour **incapacité** dès la v1 ? | 🟠 | **Non** — décès uniquement, tant qu'un juriste n'a pas tranché | Risque d'abus sur personne vivante |
| D5 | Stockage d'identifiants/mots de passe de comptes tiers ? | 🟠 | **Non** en v1 (indiquer où sont les papiers, pas les accès) | Risque de sécurité et de licéité |
| D6 | Partenariat notarial / dépôt au FCDDV | 🟢 | À explorer en Phase 2 (fort différenciateur) | Aucun à court terme |
| D7 | Modèle économique | 🟠 | À fixer avant la Phase 3 (conditionne stockage serveur et revue humaine) | Architecture serveur dimensionnée à l'aveugle |

## 17.2 Sécurité et données

| # | Décision | Bloquant | Recommandation | Impact si reportée |
|---|----------|----------|----------------|--------------------|
| D8 | **Zero-knowledge strict** (perte du code = perte des données) ou récupération assistée ? | 🔴 | Zero-knowledge + code de récupération **+ étude d'une récupération à seuil (Shamir) en Phase 2** | Décision structurante : conditionne crypto, support, promesse produit |
| D9 | **Les données doivent-elles survivre à la perte de l'appareil ?** | 🔴 | **Oui** — sinon le produit rate sa finalité. Donc sauvegarde chiffrée obligatoire en Phase 3 | Conception locale qui ne pourra pas évoluer |
| D10 | Mécanisme de libération de la clé du paquet successoral (3 options en ADR-0005) | 🟠 (Phase 2) | Option B (dépôt scellé côté serveur + délai + quorum), à valider par un cryptographe | Composant le plus sensible construit sans spécification |
| D11 | Délai de carence d'activation | 🟠 | 15 jours (compromis deuil / anti-fraude), paramétrable par l'utilisateur entre 7 et 30 | Paramètre arbitraire difficile à changer après lancement |
| D12 | Plusieurs contacts / quorum M sur N dès la v1 ? | 🟠 | Modèle de données **prévu dès le POC**, UI multi-contacts en Phase 3 | Refonte de modèle coûteuse |
| D13 | Preuves de décès acceptées et validateur | 🔴 (Phase 2) | Acte de décès + revue humaine interne à double validation ; étudier le tiers de confiance | Cœur de l'anti-fraude non spécifié |
| D14 | Hébergement : souverain (Scaleway/OVH) ou hyperscaler UE ? | 🟢 (Phase 3) | Souverain UE, argument produit fort, avec IaC portable | Verrouillage fournisseur |
| D15 | Certification HDS nécessaire ? | ⚖️ | Question au juriste dès la Phase 2 | Peut invalider le choix d'hébergeur |

## 17.3 Technique

| # | Décision | Bloquant | Recommandation | Impact si reportée |
|---|----------|----------|----------------|--------------------|
| D16 | **Plateforme du POC de Phase 1** | ✅ | Tranché : **PWA** ([ADR-0011](../decisions/0011-pwa-poc-phase-1.md)) — distribution par lien, itération rapide, accessibilité DOM | — |
| D16bis | **Plateforme de production (Phase 3+)** : React Native/Expo, Flutter, ou PWA durcie | 🟠 (Phase 3) | React Native + Expo (ADR-0002) — **à reconfirmer à la fin de la Phase 1**, au vu des tests utilisateurs et de la maturité de WebAuthn PRF | Réécriture complète si le choix change tard |
| D17 | Niveau d'IA visé (extraction vs raisonnement) | 🟠 | Commencer par **résumé + extraction + recherche** ; la génération libre est un bonus | Attentes irréalistes et coût matériel |
| D18 | Appareils minimum supportés | 🟠 | **Phase 1** : navigateurs cibles à figer (Chromium et WebKit récents, support OPFS et WebCrypto), testés en CI. **Phase 3** : iOS 16+ / Android 10+ avec secure element ; refus explicite en deçà | Promesses de sécurité non tenables ; divergences de moteurs découvertes en test utilisateur |
| D19 | Monorepo | ✅ | Tranché : ADR-0001 | — |
| D20 | Format d'export | ✅ | Tranché : VEA, ADR-0006 | — |
| D21 | Langue et i18n | 🟢 | FR seul au lancement, clés i18n dès le début | Refonte de toutes les chaînes |

## 17.4 Organisation

| # | Décision | Bloquant | Recommandation |
|---|----------|----------|----------------|
| D22 | Qui valide l'architecture (ce document) ? | ✅ | Tranché : validée par le porteur du projet. Phase 0 close, Phase 1 ouverte |
| D23 | CODEOWNERS et responsable sécurité | 🟠 | Nommer une personne responsable des chemins sensibles |
| D24 | Budget juriste + cryptographe + pentest | 🟠 | À provisionner dès maintenant (≈ le poste le plus sous-estimé) |
| D25 | Panel de testeurs Phase 1 | 🔴 | 5 à 8 personnes, dont ≥ 2 de plus de 65 ans, recrutées **avant** la fin du POC |

---

## 17.5 Ce qui est déjà tranché (ADR)

| ADR | Décision |
|-----|----------|
| [0001](../decisions/0001-monorepo-unique.md) | Monorepo unique |
| [0002](../decisions/0002-react-native-expo.md) | React Native + Expo, TypeScript strict — **phases 3+** (amendé par ADR-0011) |
| [0003](../decisions/0003-local-first-chiffrement.md) | Local-first, chiffrement enveloppe, clés dans le secure element — **variante navigateur en Phase 1** |
| [0004](../decisions/0004-ai-provider-abstraction.md) | Abstraction `AIProvider`, mock en Phase 1, on-device par défaut |
| [0005](../decisions/0005-contact-de-confiance.md) | Contact de confiance : aucun accès avant activation validée |
| [0006](../decisions/0006-format-export-vea.md) | Format d'export ouvert VEA |
| [0007](../decisions/0007-pas-de-backend-phase-1.md) | Pas de backend en Phase 1 |
| [0008](../decisions/0008-perimetre-juridique.md) | Périmètre juridique : le document n'est pas un testament valide en l'état |
| [0009](../decisions/0009-observabilite-sans-pii.md) | Observabilité sans PII, télémétrie opt-in |
| [0010](../decisions/0010-hebergement-ue-e2ee.md) | Hébergement UE et zero-knowledge côté serveur |
| [0011](../decisions/0011-pwa-poc-phase-1.md) | **PWA pour le POC de Phase 1** ; amende ADR-0002 (portée réduite aux phases 3+) et ADR-0003 (variante navigateur) |
