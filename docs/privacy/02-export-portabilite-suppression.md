# 15. Maîtrise des données : export, portabilité, import, suppression

Objectif : que l'utilisateur puisse **partir** avec toutes ses données, à tout moment, sans nous
demander la permission et sans outil propriétaire. C'est une exigence produit **et** un droit (art. 20 RGPD).

Décision de format : [ADR-0006](../decisions/0006-format-export-vea.md).

---

## 15.1 Format d'archive VEA (Veille Export Archive)

Une archive **ZIP** ouverte, documentée, lisible par n'importe qui :

```
veille-export-2026-09-14T10-30-00Z.vea.zip
├── manifest.json                # version du format, date, app, contenu, empreintes
├── README.txt                   # explication en français simple : comment lire cette archive
├── schemas/                     # JSON Schema de chaque type de données (auto-portant)
│   ├── profile.schema.json
│   ├── will.schema.json
│   ├── document.schema.json
│   ├── trusted-contact.schema.json
│   └── audit-event.schema.json
├── data/
│   ├── profile.json
│   ├── will/
│   │   ├── will.json            # état courant
│   │   └── versions/*.json      # historique complet
│   ├── documents.json           # métadonnées (référencent files/)
│   ├── trusted-contacts.json
│   ├── consents.json
│   └── audit.jsonl              # journal chaîné, une ligne = un événement
├── files/                       # DOCUMENTS DANS LEUR FORMAT D'ORIGINE
│   ├── 7f3a.../facture-edf-2026-01.pdf
│   └── ...
└── rendered/                    # lisible sans aucun outil
    ├── document-de-volontes.pdf
    └── brouillon-testament-a-recopier.pdf
```

Principes :
- **Formats originaux préservés** (un PDF reste un PDF) — exigence explicite du cahier des charges.
- **Auto-portant** : les schémas voyagent avec les données ; l'archive reste lisible dans 10 ans.
- **Vérifiable** : `manifest.json` contient le hash SHA-256 de chaque fichier.
- **Ouvert** : ZIP + JSON + JSON Schema, aucune dépendance à Veille.
- **Versionné** : `formatVersion` ; toute évolution doit rester rétrocompatible en lecture, et un
  test de migration v1→v2 est obligatoire.

---

## 15.2 Deux modes d'export

| Mode | Usage | Protection | Par défaut |
|------|-------|------------|------------|
| **Export chiffré** (`.vea.zip` chiffré par mot de passe, dérivation Argon2id) | Sauvegarde, transfert, migration | Confidentialité préservée même si l'archive est déposée dans un cloud | ✅ **Oui** |
| **Export en clair** | Consultation immédiate, remise à un notaire, exercice du droit d'accès | Aucune | Non — avertissement explicite obligatoire |

L'application **avertit** que la destination choisie (mail, cloud, clé USB) sort de sa protection.

---

## 15.3 Import / restauration

- Import d'une archive VEA (chiffrée ou non) sur un appareil neuf ⇒ **état identique** (test de
  round-trip obligatoire, cf. `docs/architecture/09-strategie-tests.md`).
- Vérification du manifeste et des hash avant tout import ; archive altérée ⇒ **rejet**, pas d'import partiel.
- Migration depuis un autre outil : point d'extension `ImportAdapter` prévu, non implémenté en Phase 1.
- L'import ne **fusionne** pas silencieusement : l'utilisateur choisit explicitement
  « remplacer » ou « ajouter », avec un récapitulatif avant exécution.

---

## 15.4 Suppression

Trois portées, toutes réversibles **uniquement** avant confirmation :

| Portée | Effet |
|--------|-------|
| Un document | Fichier + DEK + OCR + embeddings + vignettes + entrées d'index |
| Une catégorie / sélection | Idem, en lot, avec récapitulatif chiffré du nombre d'éléments |
| Tout (« repartir de zéro ») | Base, fichiers, clés, index ; l'app revient à l'état initial |

Règles :
- **Proposer systématiquement un export avant une suppression totale.**
- Suppression = effacement **et** destruction de clé (défense en profondeur sur mémoire flash).
- Un événement d'audit est conservé (**sans titre ni contenu**) : « document supprimé, 2026-09-14 ».
- Phase 3 : la suppression locale déclenche la suppression serveur (et inversement), avec
  réconciliation et vérification.

---

## 15.5 Anti-verrouillage : engagements techniques

1. Aucune donnée n'est stockée dans un format non documenté.
2. Aucune fonctionnalité d'export n'est réservée à une offre payante.
3. L'export est **complet** : il ne doit exister aucune donnée utilisateur qui ne figure pas dans
   l'archive (test automatisé comparant l'inventaire du stockage à l'inventaire de l'archive).
4. La spécification du format VEA sera publiée (dépôt public séparé, cf. `01-github-monorepo.md`).
5. Aucun identifiant propriétaire nécessaire pour relire l'archive.
