# ADR-0012 — GitHub Pages pour la distribution du POC de Phase 1

- **Statut** : Accepté
- **Date** : 2026-10-06
- **Phase concernée** : 1 (POC) uniquement
- **Amende** : [ADR-0011](0011-pwa-poc-phase-1.md) (§Consequences, ligne « Hébergement du POC »)

## Context

[ADR-0011](0011-pwa-poc-phase-1.md) a retenu une PWA pour le POC, avec un argument central :
**le coût de mise entre les mains d'un testeur doit tomber à un lien**. Elle en tirait une conséquence
d'hébergement :

> Hébergement du POC : statique, dans l'UE, sans analytique, sans CDN tiers.

Le porteur du projet a choisi **GitHub Pages**. Faits vérifiés au moment de cette décision :
le dépôt `lagentcooper/veille-app` est **public** (Pages est donc disponible sans coût), sa branche
par défaut est `main`, et Pages n'est pas encore activé.

GitHub Pages sert des fichiers statiques et **ne permet pas de définir d'en-têtes HTTP**. Or plusieurs
mitigations d'ADR-0011 reposaient sur une CSP stricte. Cette décision doit donc dire exactement ce qui
reste possible et ce qui ne l'est plus.

## Decision

**Le POC de Phase 1 est publié sur GitHub Pages**, construit et déployé par GitHub Actions.

1. **Déclencheur** : push sur `main`. Les testeurs ne voient donc que des états **promus** — cohérent
   avec le workflow `feature/* → pre → main` ([AGENTS.md](../../AGENTS.md) §8) : une promotion est le
   signal explicite « c'est prêt et bon ». Pas de déploiement automatique depuis `pre`.
2. **URL** : `https://lagentcooper.github.io/veille-app/` — donc un **sous-chemin**, pas une racine de
   domaine. `base` de Vite, portée du service worker, `scope` et `start_url` du manifeste doivent tous
   valoir `/veille-app/`.
3. **CSP par `<meta http-equiv="Content-Security-Policy">`**, à défaut d'en-tête. Les directives
   ignorées en `meta` (`frame-ancestors`, `report-to`/`report-uri`, `sandbox`) sont **indisponibles** :
   elles ne doivent pas être supposées acquises dans les revues de sécurité.
4. **Pas d'en-têtes `COOP`/`COEP`** ⇒ pas de `SharedArrayBuffer` ⇒ **Argon2id WASM en mono-thread
   uniquement**. Les paramètres de dérivation doivent être calibrés pour rester acceptables sur un
   téléphone d'entrée de gamme, sans descendre sous un coût défensable.
5. **Repli SPA** : Pages ne réécrit pas les URL. Un `404.html` identique à `index.html` est publié,
   afin qu'un lien profond ne tombe pas sur la page d'erreur de GitHub.
6. **Non indexé** : `robots.txt` et `<meta name="robots" content="noindex">`. Le POC est destiné à des
   testeurs recrutés, pas aux moteurs de recherche.
7. **La règle « aucune dépendance servie par un CDN tiers » reste entière.** Elle visait le risque
   d'exécution de code tiers (XSS, supply chain) : tout le JavaScript et le CSS restent **bundlés et
   servis par l'origine**. Servir l'application *elle-même* au travers du CDN de GitHub est un sujet
   distinct, traité ci-dessous.

## Alternatives

1. **Hébergeur statique dans l'UE** (Scaleway Object Storage + CDN, OVH) — **seule option conforme à
   la lettre d'ADR-0011**, et la seule qui autorise de vrais en-têtes HTTP. Écartée pour le POC :
   compte payant, infrastructure à provisionner et à maintenir, alors que la Phase 1 doit coûter le
   moins possible et qu'aucune donnée réelle n'y circule. **C'est vers là qu'il faudra aller** dès que
   le POC manipulera autre chose que des données fictives.
2. **Cloudflare Pages / Netlify** — gratuits, et surtout **en-têtes personnalisés possibles**, donc
   CSP réelle, `frame-ancestors` et rapports de violation. Écartés ici uniquement parce que le dépôt
   et la CI sont déjà sur GitHub et que cela n'ajoute aucun compte ni aucun secret à gérer.
   **Meilleure alternative immédiate si la CSP par `meta` se révèle insuffisante.**
3. **VPS auto-hébergé** — contrôle total, mais une machine à exploiter et à patcher pour servir des
   fichiers statiques : disproportionné.
4. **Distribution sans URL** (fichier à ouvrir localement, build remis à la main) — annule l'argument
   même d'ADR-0011 et rend le test utilisateur impraticable.

## Why

- **Zéro infrastructure, zéro coût, zéro secret supplémentaire.** Le dépôt est public et la CI existe
  déjà ; le déploiement est une dizaine de lignes de workflow.
- **Un lien suffit au testeur**, qui est l'objectif entier d'ADR-0011. Aucune installation, aucun
  TestFlight, aucun APK à autoriser.
- **Le risque est borné par le périmètre d'usage, pas par l'hébergeur.** Aucune donnée utilisateur ne
  quitte le navigateur : le serveur ne sert que des octets statiques et ne reçoit jamais de contenu.
  Ce qui rend l'hébergement hors UE acceptable **ici**, et seulement ici.
- **La promotion vers `main` comme déclencheur** évite qu'un travail en cours sur `pre` se retrouve
  devant un testeur.

## Trade-offs

Réels, et à ne pas découvrir plus tard.

| Limite | Conséquence | Traitement |
|--------|-------------|------------|
| **Aucun en-tête HTTP** | CSP seulement par `meta` ; `frame-ancestors`, `sandbox` et les rapports de violation sont perdus | CSP `meta` stricte malgré tout (ni `unsafe-inline`, ni `eval`) ; protection anti-cadrage réduite à un contrôle JavaScript, donc faible — **assumé pour un POC sans données réelles** |
| **Pas de COOP/COEP** | Pas de `SharedArrayBuffer`, donc Argon2id mono-thread | Paramètres calibrés et mesurés sur appareil modeste ; documenter le temps de déverrouillage obtenu |
| **Hébergement hors UE** (GitHub/Microsoft, États-Unis ; CDN Fastly) et **IP des visiteurs journalisées par GitHub** | Écart assumé avec ADR-0011 et avec l'esprit d'ADR-0010 | Acceptable **uniquement** parce qu'aucune donnée utilisateur ne transite. ⚖️ **À rouvrir avant tout usage avec de vrais documents** |
| **URL publique sur un dépôt public** | N'importe qui peut tomber sur l'application et y saisir de vrais documents | `noindex` + bandeau « version d'évaluation » non masquable. Le bandeau devient un **contrôle de sécurité**, plus une mention de style (risque R29) |
| **Sous-chemin `/veille-app/`** | Cause classique d'une PWA qui marche en local et casse en production (SW hors portée, assets 404) | `base` Vite, `scope`/`start_url` du manifeste et portée du SW vérifiés par un test de déploiement, pas par relecture |
| **CDN avec cache** | Une version piégée ou erronée peut persister chez les visiteurs via le service worker | Pas de `skipWaiting` silencieux (déjà exigé par ADR-0011), assets au nom haché (défaut Vite), politique de mise à jour du SW explicite |
| **Déploiement lié à `main`** | Un `main` cassé est immédiatement public | Protection de `main` (PR + CI verte) — réglage GitHub à la charge du porteur, aujourd'hui **non appliqué** |

## Consequences

- Workflow `.github/workflows/deploy-pages.yml` : build puis `actions/deploy-pages`, déclenché sur
  `main`, avec `permissions: { pages: write, id-token: write, contents: read }` et actions épinglées
  par SHA, comme les workflows existants.
- **Action manuelle requise du porteur**, impossible depuis cette session (l'API Pages est refusée
  par le proxy, HTTP 403) : *Settings → Pages → Build and deployment → Source : **GitHub Actions***.
- `apps/web` est construit avec `base: '/veille-app/'`, publie un `404.html`, un `robots.txt`, et porte
  la CSP en `meta`.
- Le threat model gagne **R29** (URL publique et saisie de vrais documents par un visiteur de passage)
  et **R28** est reformulé : l'hébergeur nommé est GitHub Pages, et le contrôle d'accès au déploiement
  devient la protection de `main`, non un accès SSH à un serveur.
- Le test de déploiement devient un critère de fin de la session A : l'application doit être
  **installable et fonctionnelle hors ligne depuis l'URL Pages**, pas seulement en local.
- ADR-0011 §Consequences est amendé : la ligne « Hébergement du POC : statique, dans l'UE » renvoie
  désormais ici.

## Revisit when

- **Avant qu'un vrai document soit saisi dans le POC** — ce qui est interdit aujourd'hui. Il faudra
  alors un hébergeur UE avec en-têtes HTTP réels (alternative 1 ou 2).
- La CSP par `meta` se révèle insuffisante (besoin de rapports de violation, de `frame-ancestors`) ⇒
  bascule vers Cloudflare Pages ou un hébergement UE, sans attendre la Phase 3.
- Argon2id mono-thread impose des paramètres trop faibles pour être défendables ⇒ revoir le schéma de
  dérivation avec le cryptographe prévu en Phase 2.
- Passage en Phase 3 : l'application devient native, cette décision devient sans objet.
