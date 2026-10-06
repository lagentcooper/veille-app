# ADR-0005 — Contact de confiance : aucun accès avant activation validée

- **Statut** : Accepté pour les principes ; **options cryptographiques à trancher en Phase 2**
- **Date** : 2026-09-14
- **Phase concernée** : 1 (simulation) → 3 (réel)

## Context

L'utilisateur désigne une personne qui, en cas de décès, pourra déclencher la transmission de ses
volontés et de certains documents. C'est la fonctionnalité la plus utile du produit et, de très loin,
**la plus dangereuse** : elle crée un chemin par lequel un tiers peut obtenir l'ensemble des données
d'une personne. Le cahier des charges pose dix questions explicites ; elles trouvent ici leur réponse.

## Decision

### Réponses aux dix questions

| Question | Réponse |
|----------|---------|
| Accès aux données avant décès ? | **Non. Aucun.** Pas même l'existence ou le nombre de documents. Garanti **techniquement** (il ne détient aucune clé), pas seulement par une règle applicative. |
| Peut-elle seulement déclencher une procédure ? | Avant activation : **oui, uniquement cela**. |
| Peut-elle consulter le document de legs ? | Seulement après activation **validée**, si l'utilisateur l'a inclus dans le paquet successoral. |
| Peut-elle consulter les autres documents ? | Seulement ceux que l'utilisateur a **explicitement** placés dans le paquet successoral. Par défaut : **aucun**. |
| Preuves nécessaires ? | Acte de décès (ou équivalent officiel) + identification du demandeur. ⚖️ Liste exacte à valider. |
| Qui valide ? | **Revue humaine à double validation** (4 yeux) par des opérateurs habilités, qui n'ont **aucun accès au contenu**. ⚖️ Étudier un tiers de confiance (notaire). |
| Comment éviter les abus ? | Défense en profondeur : preuve + revue humaine + **délai de carence** + **contre-notification multi-canal** + annulation en un geste par l'utilisateur + audit inaltérable + détection d'anomalies + limitation de débit. |
| Accès temporaire ou permanent ? | **Temporaire**, en lecture seule, expirant automatiquement (proposition : 30 jours, renouvelable une fois sur justification), chaque accès étant tracé. |
| Révocation / modification ? | À tout moment, en quelques gestes, sans justification, y compris **pendant le délai de carence** (la révocation l'emporte toujours). |
| Si le contact est indisponible ? | Contacts multiples **ordonnés** + option de **quorum M sur N** + procédure de repli (notaire/héritier) + relances automatiques en cas de silence. |

### Machine à états de l'activation

```
DESIGNATED ──enrôlement──► ENROLLED
                              │ demande + preuves
                              ▼
                         REQUESTED ──contrôles automatiques──► UNDER_REVIEW
                              │                                    │
                     rejet ◄──┘                       validation (2 opérateurs)
                                                                   ▼
                                                            WAITING_PERIOD  (délai de carence,
                                                                   │         contre-notifications)
        ┌──────────────────────────────────────────────────────────┤
        │ l'utilisateur s'oppose / se reconnecte / révoque          │ délai écoulé
        ▼                                                          ▼
    CANCELLED (définitif, alerte de fraude)                     ACTIVATED
                                                                   │ accès limité et tracé
                                                                   ▼
                                                                EXPIRED
```

### Principes techniques

- Le contact ne reçoit **jamais** de clé avant `ACTIVATED`.
- Le **paquet successoral** est un sous-ensemble choisi à l'avance par l'utilisateur, scellé
  séparément (`DEK_legacy`), et re-scellé à chaque modification des droits.
- Tous les états et transitions sont journalisés dans l'audit inaltérable.
- L'**incapacité** n'est pas traitée en v1 (D4) : bien plus difficile à prouver, et le risque
  d'abus porte sur une personne vivante.

### Options pour la libération de la clé (à trancher en Phase 2)

| Option | Principe | Avantage | Inconvénient |
|--------|----------|----------|--------------|
| **A — Tout local** | La clé est remise au contact hors application (enveloppe physique, coffre) | Zero-knowledge parfait, aucun serveur | Aucune protection contre un usage anticipé ; perte probable ; ingérable pour l'utilisateur |
| **B — Dépôt scellé côté serveur** *(recommandée)* | `DEK_legacy` est chiffrée avec une clé publique du service d'activation **et** un secret détenu par le contact ; la libération exige les deux, plus la validation et le délai | Anti-abus réel, révocation possible, expérience utilisateur acceptable | Le service devient un maillon critique (mais ne peut pas déchiffrer seul) ; complexité |
| **C — Partage à seuil (Shamir)** | La clé est découpée en N parts (contacts, service, notaire), M parts nécessaires | Pas de point unique de confiance ; élégant | Complexe pour des utilisateurs non techniques ; coordination difficile au décès |

Recommandation : **B**, avec étude de **C** pour la récupération de compte.
**Revue par un cryptographe externe obligatoire avant implémentation.**

## Alternatives écartées

1. **Accès en lecture anticipé** (« pour qu'il puisse vérifier ») — crée exactement le risque que le
   produit prétend écarter.
2. **Dead man's switch pur** (activation si l'utilisateur ne se connecte pas pendant X mois) — trop
   de faux positifs (hospitalisation, voyage, téléphone cassé) avec une conséquence irréversible.
   Peut être un **signal complémentaire**, jamais un déclencheur unique.
3. **Validation entièrement automatisée** de l'acte de décès — les faux documents sont trop faciles à
   produire ; l'enjeu justifie un coût humain.
4. **Activation immédiate sans délai** — supprime la seule fenêtre où l'utilisateur peut s'opposer.

## Why

Le risque dominant du produit est l'**activation frauduleuse par un proche**. Aucun contrôle unique
n'y résiste : seule la combinaison preuve + humain + délai + notification + révocabilité + audit
offre une protection crédible. Le délai de carence est le contrôle le plus puissant, car il donne à
la victime potentielle une chance de réagir.

## Trade-offs

- Expérience dégradée pour des héritiers légitimes en deuil (attente de 15 jours, démarches).
  Atténuation : communication empathique, suivi transparent de l'état, accompagnement.
- Coût opérationnel de la revue humaine → impacte le modèle économique (D7).
- Le service devient un maillon critique (option B) → isolation, audit, double validation.
- L'utilisateur doit choisir à l'avance le contenu du paquet successoral : effort supplémentaire,
  compensé par un choix par défaut sûr (le document de volontés uniquement).

## Consequences

- `packages/core/src/trusted-contact` contient la machine à états, testée **exhaustivement**
  (y compris toutes les transitions illégales) dès la Phase 1, même si l'activation y est simulée.
- Le service d'activation est **déployé séparément** (voir architecture cible §5.2).
- Un back-office de revue est nécessaire dès la Phase 3 (sans accès au contenu).
- Des abuse cases détaillés doivent être écrits en Phase 2 **avant** tout code.
- Les tests de sécurité vérifient qu'aucun état antérieur à `ACTIVATED` ne donne le moindre accès.

## Revisit when

- L'avis juridique impose d'autres preuves ou un autre validateur.
- Un partenariat notarial change le modèle de confiance.
- Les retours utilisateurs montrent que le délai de carence est inacceptable en pratique.
