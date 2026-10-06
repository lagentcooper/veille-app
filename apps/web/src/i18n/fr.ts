import { willFr } from "./will-fr";

/** French UI texts. Components reference keys only (AGENTS.md §4). */
export const fr = {
  will: willFr,
  app: {
    name: "Veille",
    skipToContent: "Aller au contenu",
    loading: "Chargement…",
  },
  banner: {
    title: "Version d'évaluation",
    body: "N'y déposez aucun vrai document : cette version sert uniquement à des essais.",
  },
  welcome: {
    title: "Bienvenue sur Veille",
    intro:
      "Veille vous aide à écrire vos volontés et à les mettre à l'abri, simplement, à votre rythme.",
    local: "Tout reste sur cet appareil. Il n'y a ni compte, ni adresse e-mail à créer.",
    guided:
      "Une question à la fois, à votre rythme. Vous pouvez vous arrêter et reprendre plus tard.",
    notLawyer:
      "Veille ne remplace pas un notaire ni un avocat. Elle vous aide à vous organiser et vous dit quand il vaut mieux consulter un professionnel.",
    start: "Commencer",
    whereData: "Où sont mes données ?",
  },
  create: {
    stepsLabel: "Étapes de création",
    currentStep: "étape en cours",
    steps: { name: "Votre prénom", code: "Votre code", confirm: "Confirmation" },
    name: {
      title: "Comment souhaitez-vous qu'on vous appelle ?",
      label: "Prénom",
      hint: "Il sert uniquement à vous saluer. Il reste sur cet appareil.",
      next: "Continuer",
      required: "Merci d'indiquer un prénom.",
    },
    code: {
      title: "Choisissez un code à 6 chiffres",
      label: "Votre code",
      hint: "Il verrouille l'application. Choisissez-en un que vous retiendrez et que personne ne devine facilement.",
      warning:
        "Important : Veille ne connaît pas votre code et ne peut pas le retrouver. Si vous l'oubliez, vos données ne pourront pas être récupérées.",
      next: "Continuer",
      back: "Retour",
      format: "Le code doit contenir exactement 6 chiffres.",
      repeated: "Évitez un code avec le même chiffre répété.",
      sequence: "Évitez une suite de chiffres comme 123456.",
    },
    confirm: {
      title: "Saisissez à nouveau votre code",
      label: "Votre code, une seconde fois",
      submit: "Créer mon espace",
      back: "Retour",
      mismatch: "Les deux codes ne sont pas identiques. Essayez à nouveau.",
      working: "Protection de votre espace en cours… Cela peut prendre quelques secondes.",
    },
  },
  unlock: {
    title: "Déverrouiller Veille",
    label: "Votre code à 6 chiffres",
    submit: "Déverrouiller",
    working: "Vérification en cours… Cela peut prendre quelques secondes.",
    wrong: "Ce code n'est pas le bon. Il vous reste {{count}} essai avant une pause.",
    wrong_other: "Ce code n'est pas le bon. Il vous reste {{count}} essais avant une pause.",
    lockedOut: "Trop d'essais. Par sécurité, patientez {{time}} avant de réessayer.",
    forgot: "Code oublié ?",
    forgotBody:
      "Veille ne peut pas retrouver votre code. La seule solution est de tout effacer et de recommencer, ce qui supprime les données de cet appareil.",
  },
  home: {
    title: "Bonjour {{name}}",
    ready: "Votre espace est ouvert et protégé par votre code.",
    legs: "Mon document de legs",
    legsBody:
      "Préparez votre brouillon de testament, vos volontés, et notez où se trouve votre testament écrit à la main.",
    legsOpen: "Ouvrir",
    soon: "Vous pouvez aussi vérifier où se trouvent vos données.",
    lock: "Verrouiller",
    whereData: "Où sont mes données ?",
    autoLock:
      "Veille se verrouille d'elle-même après quelques minutes d'inactivité ou quand vous quittez l'onglet.",
  },
  data: {
    title: "Où sont mes données ?",
    back: "Retour",
    onDevice: {
      title: "Sur cet appareil, et nulle part ailleurs",
      body: "Ce que vous saisissez est enregistré dans ce navigateur, sous forme chiffrée. Rien n'est envoyé sur internet : Veille ne contacte aucun serveur pendant que vous l'utilisez.",
    },
    notDone: {
      title: "Ce que Veille ne fait pas",
      items: [
        "Elle ne crée pas de compte et ne vous demande ni e-mail ni téléphone.",
        "Elle n'envoie aucune donnée à un tiers et ne mesure pas votre usage.",
        "Elle ne peut pas retrouver votre code si vous l'oubliez.",
        "Elle ne remplace pas un notaire ni un avocat.",
      ],
    },
    persistence: {
      title: "Votre navigateur peut-il effacer ces données ?",
      persisted:
        "Non : ce navigateur s'est engagé à conserver vos données. Elles pourraient tout de même disparaître si vous videz les données du site ou changez d'appareil.",
      "best-effort":
        "Oui, c'est possible. Si l'appareil manque de place, le navigateur peut effacer les données de Veille sans prévenir. Vous pouvez lui demander de les protéger, mais il n'est pas obligé d'accepter.",
      unsupported:
        "Ce navigateur ne permet pas de le savoir. Par prudence, considérez que les données peuvent être effacées sans prévenir.",
      unknown: "Vérification en cours…",
      request: "Demander la protection de mes données",
      denied:
        "Le navigateur n'a pas accepté pour le moment. Réessayez plus tard, après avoir utilisé Veille quelques fois.",
      granted: "Le navigateur a accepté de protéger vos données.",
    },
    usage: { title: "Place utilisée", value: "{{used}} sur {{quota}} disponibles" },
    evaluation: {
      title: "Version d'évaluation",
      body: "Cette version sert à des essais. N'y déposez aucun vrai document : les protections d'un navigateur ne sont pas celles de l'application définitive.",
    },
    delete: {
      button: "Supprimer toutes mes données",
      title: "Tout supprimer ?",
      body: "Votre profil et tout ce que vous avez enregistré sur cet appareil seront effacés pour de bon. Il n'y a pas de corbeille et il sera impossible de revenir en arrière.",
      confirm: "Oui, tout supprimer",
      cancel: "Non, garder mes données",
      done: "Vos données ont été supprimées de cet appareil.",
    },
  },
  update: {
    available: "Une nouvelle version de Veille est disponible.",
    apply: "Mettre à jour",
  },
  duration: {
    seconds_one: "{{count}} seconde",
    seconds_other: "{{count}} secondes",
    minutes_one: "{{count}} minute",
    minutes_other: "{{count}} minutes",
  },
  size: { unknown: "inconnu", mb: "{{value}} Mo" },
} as const;
