# 9. DevSecOps

Principe : **peu d'outils, bien configurés, bloquants aux bons endroits.**
Un pipeline que l'équipe contourne parce qu'il est trop lent ne protège personne.

---

## 9.1 Chaîne cible

```
Développeur
  │ pre-commit (rapide : format, lint, gitleaks, tests du domaine touchés)
  ▼
Pull Request ──► CI obligatoire
  │               ├─ lint + typecheck
  │               ├─ tests unitaires + intégration
  │               ├─ SAST (CodeQL + Semgrep règles maison)
  │               ├─ secrets (Gitleaks + push protection GitHub)
  │               ├─ dépendances (audit + Grype) + SBOM (Syft)
  │               ├─ tests privacy (scan PII dans les logs)
  │               └─ build application (artefact signé)
  │ revue humaine (CODEOWNERS ; revue sécurité obligatoire sur crypto/permissions/activation/IaC)
  ▼
merge main ──► build + E2E (Maestro) + tests de migration + tests de restauration
  ▼
staging (déploiement automatique) ──► validation (E2E, DAST, tests manuels d'accessibilité)
  ▼
production (approbation manuelle, déploiement progressif, rollback prêt)
```

---

## 9.2 Outils recommandés

| Besoin | Recommandation | Rôle | Avantage | Inconvénient | Coût | Alternative |
|--------|----------------|------|----------|--------------|------|-------------|
| CI/CD | **GitHub Actions** | Pipelines | Intégré, OIDC, écosystème | Verrouillage GitHub, coût minutes macOS | Gratuit puis à l'usage | GitLab CI, Woodpecker |
| SAST | **CodeQL** + **Semgrep OSS** | Analyse statique | CodeQL gratuit sur repo privé via GH Advanced Security ⚠️ (sinon payant) ; Semgrep permet des **règles maison** (« pas de log de contenu », « pas d'appel réseau dans `packages/ai/local` ») | Faux positifs, temps CI | Semgrep OSS gratuit | SonarQube CE |
| Secrets | **Gitleaks** + GitHub push protection | Empêcher la fuite | Bloque avant le push | Faux positifs | Gratuit | TruffleHog |
| Dépendances | **Dependabot** + **Grype** | CVE et mises à jour | Natif, PR groupées | Bruit | Gratuit | Renovate (plus configurable), Snyk (payant) |
| SBOM | **Syft** (CycloneDX) | Inventaire | Standard ouvert, attachable à la release | À exploiter pour être utile | Gratuit | Trivy |
| Web (Phase 1) | **Lighthouse CI** | Audit PWA, accessibilité, bonnes pratiques | Mesure l'installabilité, le hors-ligne et l'accessibilité au lieu de les supposer | Seuils à calibrer pour éviter le bruit | Gratuit | `pa11y`, `axe-core` seuls |
| Web (Phase 1) | **CSP + `Permissions-Policy`** servies par l'hébergeur statique | Réduction de surface | Neutralise la classe d'attaque principale du POC (R25) | À tenir à jour à chaque nouvelle ressource | Gratuit | CSP en `<meta>` (plus faible) |
| Mobile (Phase 3+) | **MobSF** (analyse d'artefact) | SAST mobile | Spécifique aux risques mobiles | Installation locale | Gratuit | NowSecure (payant) |
| Conteneurs (Phase 3) | **Trivy** | Scan images/IaC | Rapide, polyvalent | — | Gratuit | Grype + Checkov |
| IaC | **Terraform** + **Checkov**/**tfsec** | Infra as code + contrôle | Reproductible, revu en PR | Courbe d'apprentissage | Gratuit (Terraform OSS/OpenTofu) | Pulumi, OpenTofu |
| DAST (Phase 4) | **OWASP ZAP** | Test dynamique API | Gratuit, automatisable | Faux positifs, à cadrer | Gratuit | Burp Suite Pro (~450 €/an) |
| Secrets runtime | **KMS + gestionnaire de secrets du cloud** | Stockage/rotation | Intégré, tracé | Verrouillage fournisseur | À l'usage | HashiCorp Vault (auto-hébergé) |
| E2E web (Phase 1) | **Playwright** | Parcours utilisateur | Vrai navigateur : teste aussi le service worker, le stockage et l'absence de requête sortante | Suites lentes si mal cadrées | Gratuit | Cypress |
| E2E mobile (Phase 3+) | **Maestro** | Parcours utilisateur | Simple, YAML lisible | Moins puissant que Detox | Gratuit | Detox |
| Distribution (Phase 1) | **Hébergement statique UE** | Servir la PWA | Aucun backend, aucune donnée utilisateur ne transite ; un lien suffit au testeur | L'hébergeur voit les adresses IP | Gratuit à faible | Auto-hébergement |
| Build/distribution (Phase 3+) | **EAS Build** (Expo) | Builds signés, stores | Gère la signature et les stores | Coût, dépendance Expo | ~30–100 $/mois | Fastlane auto-hébergé |
| Observabilité | **OpenTelemetry** + Grafana/Loki/Tempo | Logs, métriques, traces | Standard ouvert, portable | À opérer | Gratuit (auto-hébergé) | Datadog (cher), Grafana Cloud |
| Erreurs | **Sentry auto-hébergé (UE)** | Crash reporting opt-in | Contrôle des données | Exploitation | Gratuit/à l'usage | Bugsnag |

> ⚠️ Vérifier les conditions actuelles de CodeQL sur dépôt privé ; si payant, Semgrep OSS seul est
> un compromis acceptable au départ.

---

## 9.3 Gestion des secrets

1. **Aucun secret dans Git** (ni historique) — Gitleaks + push protection + revue.
2. `.env.example` avec clés vides ; `.env` dans `.gitignore`.
3. CI → cloud via **OIDC**, pas de clé statique de longue durée.
4. Secrets de production dans le gestionnaire de secrets, **injectés au runtime**, jamais dans une image.
5. **Rotation** : automatique pour les secrets de service (≤ 90 jours), immédiate en cas de suspicion.
6. Environnements GitHub `staging`/`production` avec *required reviewers* et secrets scopés.
7. Procédure de fuite documentée dans `SECURITY.md` : révoquer d'abord, enquêter ensuite.

---

## 9.4 Ce qui bloque une PR (non négociable)

- Lint, typecheck, tests en échec
- Secret détecté
- Vulnérabilité **critique/haute** exploitable dans une dépendance utilisée
- PII détectée dans les logs
- Absence de test sur un chemin critique modifié (crypto, permissions, activation, export, suppression)
- Requête vers une origine tierce détectée pendant les tests, ou CSP affaiblie (Phase 1)
- ADR manquant pour une décision structurante
- CODEOWNERS sécurité non approuvé sur un chemin sensible

---

## 9.5 Phasage réaliste

| Phase | DevSecOps en place |
|-------|--------------------|
| **1 (POC)** | Branch protection, PR, lint, typecheck, tests unitaires, Gitleaks, Dependabot, PR template avec checklist DoD. Plus, parce que le POC est web : **vérification de la CSP**, **test hors ligne**, **assertion « aucune requête sortante »**. **C'est tout** — le reste serait du bruit. |
| **2** | + Semgrep (règles maison privacy/IA), SBOM, tests E2E, tests de migration |
| **3** | + IaC + Checkov, environnements séparés, OIDC, KMS, déploiement progressif, sauvegardes |
| **4** | + DAST, MobSF, pentest externe, exercice de restauration, revue de conformité |
| **5** | + Astreinte, gestion d'incident, rotation de secrets automatisée, post-mortems |
