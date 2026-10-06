/**
 * French texts of the will journey. Plain language, no legal jargon, never the word "valide":
 * the application only ever says "complet selon notre checklist" (ADR-0008).
 *
 * ⚖️ **VALIDATION JURIDIQUE REQUISE** — every sentence below that describes a legal situation or a
 * handwriting rule (guide, disclaimers, blocking cases, PDF wording) was written by a developer.
 * It must be reviewed by a lawyer before any real use.
 *
 * Keys under `will.finding.*`, `will.disclaimer.*`, `will.guide.*` and `will.step.*` are emitted by
 * the domain (`packages/core/src/will`); a test checks that none is missing.
 */
export const willFr = {
  nav: { back: "Retour à mon document de legs", home: "Accueil" },

  disclaimer: {
    region: "À savoir avant de continuer",
    notLegalAdvice:
      "Veille ne remplace pas un notaire ni un avocat : elle vous aide à vous organiser et ne donne aucun conseil juridique.",
    handwrittenFormRequired:
      "Ce que vous écrivez ici n'est pas un testament. Un testament doit être écrit en entier à la main, daté et signé par vous.",
    consultNotary: "Faire relire votre document par un notaire est la meilleure précaution.",
  },

  /**
   * ⚖️ **VALIDATION JURIDIQUE REQUISE** — plain-language definitions of "testament" and "legs" and of
   * what the law reserves. Written by a developer from general knowledge, not reviewed by a lawyer.
   */
  explainer: {
    title: "Legs, testament : quelle différence ?",
    intro: "Deux mots qu'on confond souvent. Voici leur sens, simplement.",
    testament: {
      term: "Un testament",
      text: "C'est le document que vous écrivez pour dire ce que deviennent vos biens après votre décès. Le plus courant est écrit en entier à la main, daté et signé.",
    },
    legacy: {
      term: "Un legs",
      text: "C'est ce que vous laissez à une personne ou à un organisme dans votre testament. Par exemple : « Je laisse ma montre à ma nièce. » Un legs se fait donc dans un testament, pas à côté.",
    },
    wishes: {
      term: "Vos volontés hors testament",
      text: "Vos souhaits pour les obsèques, vos messages, l'endroit où sont vos papiers. C'est précieux pour vos proches, mais ce n'est pas un testament : cela ne partage pas vos biens.",
    },
    inVeille: {
      title: "Dans Veille",
      draft:
        "Le brouillon prépare le texte de votre testament, avec vos legs. Vous le recopiez ensuite à la main.",
      wishes: "Vos volontés forment une partie à part.",
      record: "Si vous avez déjà un testament, vous indiquez seulement où il est rangé.",
    },
    law: "Sans testament, la loi prévoit elle-même qui hérite. Et même avec un testament, elle réserve une part à certains proches : c'est pourquoi un notaire doit regarder certaines situations.",
    footnote: "Explication générale, en langage courant. Ce n'est pas un conseil juridique.",
  },

  guide: {
    title: "Comment faire pour que votre testament compte",
    writeEverythingByHand:
      "Recopiez le texte en entier, à la main, sur une feuille. Un texte tapé ou imprimé ne suffit pas.",
    dateIt: "Écrivez la date (jour, mois, année) de votre main.",
    signIt: "Signez de votre main, comme d'habitude.",
    keepItSafe: "Rangez la feuille dans un endroit sûr, que vos proches pourront trouver.",
    declareItsLocation: "Indiquez ensuite dans Veille où vous l'avez rangée.",
    haveItReviewedByNotary:
      "Idéalement, faites-la relire ou déposez-la chez un notaire : c'est la meilleure précaution.",
  },

  step: {
    reviewWithNotary: "Dernière étape : faire relire chez un notaire",
  },

  status: {
    notStarted: "Pas encore commencé",
    complete: "Complet selon notre checklist",
    incomplete: "À compléter",
    "professional-required": "À faire voir par un professionnel",
  },

  options: {
    answer: { yes: "Oui", no: "Non", unknown: "Je ne sais pas" },
  },

  save: {
    saving: "Enregistrement…",
    saved: "Enregistré à {{time}}",
    error:
      "L'enregistrement a échoué. Ne fermez pas cette page : vos dernières réponses ne sont peut-être pas conservées.",
    exit: "Enregistrer et quitter",
  },

  error: {
    unreadableTitle: "Impossible de relire vos documents",
    unreadable:
      "Vos documents enregistrés n'ont pas pu être relus : ils ont peut-être été modifiés ou abîmés. Par sécurité, Veille ne les écrasera pas. Vous pouvez tout effacer et recommencer depuis « Où sont mes données ? ».",
    loading: "Ouverture de vos documents…",
  },

  hub: {
    title: "Mon document de legs",
    intro:
      "Voici les trois parties de votre dossier. Elles sont séparées volontairement : chacune sert à autre chose.",
    cards: {
      draft: {
        title: "Brouillon de testament à recopier à la main",
        body: "Un texte préparé avec vous, que vous recopierez ensuite à la main pour en faire votre testament.",
      },
      wishes: {
        title: "Mes volontés (hors testament)",
        body: "Vos souhaits pour les obsèques, des messages pour vos proches, l'endroit où sont vos papiers. Utile même sans testament.",
      },
      record: {
        title: "Où se trouve mon testament écrit à la main",
        body: "Si vous avez déjà un testament, dites simplement où il est rangé.",
      },
    },
    start: "Commencer",
    resume: "Continuer",
    edit: "Modifier",
    review: "Faire le point",
    reviewBody: "Voir ce qui manque et ce pour quoi il vaut mieux voir un professionnel.",
    export: "Obtenir mes documents (PDF)",
    history: "Historique des versions",
  },

  wizard: {
    progressLabel: "Avancement",
    progress: "Question {{n}} sur {{total}}",
    next: "Continuer",
    skip: "Passer cette question",
    skipHint:
      "Vous pouvez passer cette question et y revenir plus tard : elle sera signalée comme à compléter.",
    back: "Retour",
    finish: "Terminer",
    yourAnswer: "Votre réponse",
    unnamedPerson: "cette personne",
    unnamedItem: "cet élément",
  },

  q: {
    testatorFullName: {
      title: "Quel est votre nom complet ?",
      label: "Prénom(s) et nom",
      hint: "Tel qu'il figure sur votre pièce d'identité. Il apparaîtra sur le texte à recopier.",
    },
    maritalStatus: {
      title: "Quelle est votre situation familiale ?",
      options: {
        single: "Célibataire",
        married: "Marié(e)",
        pacs: "Pacsé(e)",
        divorced: "Divorcé(e)",
        widowed: "Veuf ou veuve",
      },
    },
    spousalDonation: {
      title: "Avez-vous déjà fait une donation à votre conjoint ou ancien conjoint ?",
      hint: "Par exemple devant un notaire, au profit de la personne avec qui vous êtes ou avez été marié(e).",
    },
    hasChildren: {
      title: "Avez-vous des enfants ?",
      hint: "Y compris adoptés ou d'une précédente union.",
    },
    hasMinorChildren: { title: "Avez-vous un enfant qui a moins de 18 ans ?" },
    blendedFamily: { title: "Vos enfants sont-ils nés d'unions différentes ?" },
    lifeInsurance: { title: "Avez-vous un contrat d'assurance-vie ?" },
    ownsRealEstate: {
      title: "Possédez-vous un bien immobilier ?",
      hint: "Maison, appartement, terrain… même en partie.",
    },
    ownsBusinessInterests: {
      title: "Possédez-vous une entreprise, des parts de société ou une exploitation agricole ?",
    },
    assetsAbroad: { title: "Possédez-vous un bien (logement, compte…) à l'étranger ?" },
    residesOutsideFrance: { title: "Habitez-vous en dehors de la France ?" },
    foreignNationality: { title: "Avez-vous une nationalité autre que la nationalité française ?" },
    legalProtection: {
      title: "Êtes-vous placé(e) sous une mesure de protection ?",
      hint: "Par exemple une tutelle ou une curatelle.",
      options: {
        none: "Non, aucune mesure",
        guardianship: "Oui, une tutelle",
        curatorship: "Oui, une curatelle",
        other: "Oui, une autre mesure de protection",
      },
    },
    beneficiary: {
      name: {
        title: "À qui souhaitez-vous laisser quelque chose ?",
        label: "Nom de la personne ou de l'organisme",
        hint: "Par exemple : Marie Dupont, ou une association.",
      },
      kind: {
        title: "« {{name}} » : s'agit-il d'une personne ou d'un organisme ?",
        options: {
          "natural-person": "Une personne",
          "legal-entity": "Une association, une fondation ou un autre organisme",
        },
      },
      minor: { title: "La personne « {{name}} » a-t-elle moins de 18 ans ?" },
      more: {
        first: "Souhaitez-vous désigner quelqu'un à qui laisser quelque chose ?",
        title: "Souhaitez-vous désigner quelqu'un d'autre ?",
        yes: "Oui, ajouter quelqu'un",
        no: "Non, passer à la suite",
      },
    },
    provision: {
      beneficiary: { title: "À qui voulez-vous laisser cela ?" },
      subject: {
        title: "Que souhaitez-vous laisser à « {{name}} » ?",
        titleNoName: "Que souhaitez-vous laisser ?",
        label: "Ce que vous laissez",
        hint: "Décrivez-le avec vos mots : un objet, une somme, une part…",
      },
      clause: {
        title: "Cette volonté dépend-elle d'une condition ou d'une obligation ?",
        hint: "Par exemple « à condition que… » ou « à charge pour lui de… ».",
        options: {
          none: "Non, rien de particulier",
          condition: "Oui, elle dépend d'une condition",
          charge: "Oui, elle impose une obligation",
        },
      },
      more: {
        first: "Souhaitez-vous indiquer ce que vous laissez ?",
        title: "Souhaitez-vous laisser autre chose ?",
        yes: "Oui, ajouter une volonté",
        no: "Non, c'est tout",
      },
    },
    handwritingGuide: {
      title: "Avant de terminer : comment recopier votre texte",
      label:
        "J'ai compris : je devrai recopier le texte entièrement à la main, le dater et le signer.",
    },
    funeral: {
      title: "Avez-vous des souhaits pour vos obsèques ?",
      label: "Vos souhaits",
      hint: "Cérémonie, musique, lieu, inhumation ou crémation… Écrivez ce qui compte pour vous, ou passez.",
    },
    hasBodyWishes: {
      title: "Souhaitez-vous donner vos organes ou votre corps ?",
      hint: "Ces situations obéissent à des règles précises : nous vous indiquerons simplement vers qui vous tourner.",
    },
    bodyWishesNote: { title: "Voulez-vous préciser ce souhait ?", label: "Votre précision" },
    message: {
      recipient: {
        title: "À qui voulez-vous laisser un message ?",
        label: "Pour qui",
        hint: "Par exemple : mes petits-enfants, ou Marie.",
      },
      text: { title: "Que souhaitez-vous dire à « {{name}} » ?", label: "Votre message" },
      more: {
        first: "Souhaitez-vous laisser un message à un proche ?",
        title: "Souhaitez-vous laisser un autre message ?",
        yes: "Oui, ajouter un message",
        no: "Non, passer à la suite",
      },
    },
    paper: {
      label: {
        title: "Quel papier important voulez-vous signaler ?",
        label: "Le papier ou le document",
        hint: "Par exemple : contrat d'assurance, titre de propriété, carnet d'adresses.",
      },
      location: {
        title: "Où se trouve « {{name}} » ?",
        label: "Son emplacement",
        hint: "Indiquez où le trouver. N'écrivez ni mot de passe ni code secret.",
      },
      more: {
        first: "Souhaitez-vous indiquer où se trouvent des papiers importants ?",
        title: "Un autre papier à signaler ?",
        yes: "Oui, ajouter un papier",
        no: "Non, j'ai terminé",
      },
    },
    existence: {
      title: "Avez-vous déjà écrit un testament à la main ?",
      options: { exists: "Oui, j'en ai un", none: "Non, pas encore" },
    },
    locationKind: {
      title: "Où est-il rangé ?",
      options: {
        home: "Chez moi",
        notary: "Chez un notaire",
        relative: "Chez un proche",
        "bank-safe": "Dans un coffre (banque)",
        other: "Ailleurs",
      },
    },
    locationDetail: {
      title: "Pouvez-vous préciser l'endroit ?",
      label: "Précisions",
      hint: "Par exemple : tiroir du bureau, ou le nom du notaire. Rien de plus.",
    },
    registeredInCentralFile: {
      title: "Est-il inscrit au fichier central des dispositions de dernières volontés ?",
      hint: "C'est un registre tenu par les notaires. Si vous ne savez pas, répondez « Je ne sais pas ».",
    },
  },

  finding: {
    fix: "Compléter",
    change: "Modifier ma réponse",
    missing: {
      testatorFullName: "Votre nom complet n'est pas indiqué.",
      beneficiaries: "Vous n'avez désigné personne.",
      provisions: "Vous n'avez pas encore indiqué ce que vous laissez.",
      handwritingGuideAcknowledged:
        "Vous n'avez pas encore lu comment recopier le texte à la main.",
      situation: {
        maritalStatus: "Votre situation familiale n'est pas indiquée.",
        hasChildren: "Vous n'avez pas dit si vous avez des enfants.",
        lifeInsurance: "Vous n'avez pas dit si vous avez une assurance-vie.",
        ownsRealEstate: "Vous n'avez pas dit si vous possédez un bien immobilier.",
        ownsBusinessInterests:
          "Vous n'avez pas dit si vous possédez une entreprise, des parts de société ou une exploitation agricole.",
        assetsAbroad: "Vous n'avez pas dit si vous possédez un bien à l'étranger.",
        residesOutsideFrance: "Vous n'avez pas dit si vous habitez hors de France.",
        foreignNationality: "Vous n'avez pas dit si vous avez une autre nationalité.",
        legalProtection: "Vous n'avez pas dit si vous êtes sous une mesure de protection.",
        spousalDonation: "Vous n'avez pas dit si vous avez fait une donation à un conjoint.",
        hasMinorChildren: "Vous n'avez pas dit si l'un de vos enfants a moins de 18 ans.",
        blendedFamily: "Vous n'avez pas dit si vos enfants sont nés d'unions différentes.",
      },
      beneficiary: {
        displayName: "Une personne désignée n'a pas de nom.",
        isMinor: "Vous n'avez pas dit si une personne désignée a moins de 18 ans.",
      },
      provision: { subject: "Une volonté n'est pas décrite." },
      content: "Vous n'avez encore rien écrit dans cette partie.",
      hasBodyWishes: "Vous n'avez pas dit si vous souhaitez donner vos organes ou votre corps.",
      message: {
        recipientLabel: "Un message n'a pas de destinataire.",
        text: "Un message est vide.",
      },
      papers: {
        label: "Un papier signalé n'a pas de nom.",
        location: "Un papier signalé n'a pas d'emplacement.",
      },
      existence: "Vous n'avez pas dit si vous avez déjà un testament écrit à la main.",
      locationKind: "Vous n'avez pas dit où est rangé votre testament.",
      locationDetail: "L'endroit où est rangé votre testament n'est pas précisé.",
      registeredInCentralFile:
        "Vous n'avez pas dit si votre testament est inscrit au fichier central des dispositions de dernières volontés.",
    },
    inconsistency: {
      provisionWithoutBeneficiary: "Une volonté n'est liée à aucune personne désignée.",
      beneficiaryWithoutProvision: "Une personne désignée ne reçoit rien dans votre texte.",
      duplicateId: "Un élément apparaît en double. Rouvrez cette partie et vérifiez-la.",
    },
    discouraged: {
      credentialsStored:
        "Il semble que vous ayez noté un mot de passe ou un code. Mieux vaut ne pas l'écrire ici : indiquez seulement où se trouvent les papiers.",
    },
    blocking: {
      "reserved-heirs":
        "La loi protège une part de l'héritage pour certains proches, ce qui limite ce que vous pouvez laisser librement. Un notaire doit regarder votre situation avec vous.",
      "reserved-heirs_children":
        "Vous avez des enfants. La loi leur réserve une part de votre héritage, ce qui limite ce que vous pouvez laisser librement. Un notaire doit regarder votre situation avec vous.",
      "reserved-heirs_spouse":
        "Vous êtes marié(e) et vous n'avez pas d'enfant. La loi peut réserver une part de votre héritage à votre conjoint, ce qui limite ce que vous pouvez laisser librement. Un notaire doit regarder votre situation avec vous.",
      "real-estate-or-business":
        "Un bien immobilier, une entreprise, des parts de société ou une exploitation agricole se transmettent avec des règles particulières. Un notaire doit s'en occuper.",
      "real-estate-or-business_real-estate":
        "Vous possédez un bien immobilier. Sa transmission obéit à des règles particulières : un notaire doit s'en occuper.",
      "real-estate-or-business_business":
        "Vous possédez une entreprise, des parts de société ou une exploitation agricole. Leur transmission obéit à des règles particulières : un notaire doit s'en occuper.",
      "foreign-element":
        "Quand un bien, une résidence ou une nationalité est à l'étranger, plusieurs pays peuvent être concernés. Un notaire doit vous dire quelles règles s'appliquent.",
      "foreign-element_assets-abroad":
        "Vous possédez un bien à l'étranger : plusieurs pays peuvent être concernés. Un notaire doit vous dire quelles règles s'appliquent.",
      "foreign-element_residence-abroad":
        "Vous habitez hors de France : plusieurs pays peuvent être concernés. Un notaire doit vous dire quelles règles s'appliquent.",
      "foreign-element_foreign-nationality":
        "Vous avez une nationalité autre que française : plusieurs pays peuvent être concernés. Un notaire doit vous dire quelles règles s'appliquent.",
      "marital-regime-pacs-or-life-insurance":
        "Le mariage, le PACS, une donation entre époux ou une assurance-vie changent ce que vous pouvez laisser et à qui. Un notaire doit regarder votre situation avec vous.",
      "marital-regime-pacs-or-life-insurance_marital-regime":
        "Vous êtes marié(e) : votre régime matrimonial change ce que vous pouvez laisser. Un notaire doit regarder votre situation avec vous.",
      "marital-regime-pacs-or-life-insurance_pacs":
        "Vous êtes pacsé(e) : cela change ce que vous pouvez laisser à votre partenaire et à vos autres proches. Un notaire doit regarder votre situation avec vous.",
      "marital-regime-pacs-or-life-insurance_spousal-donation":
        "Vous avez fait une donation à votre conjoint : elle change ce que vous pouvez laisser. Un notaire doit regarder votre situation avec vous.",
      "marital-regime-pacs-or-life-insurance_life-insurance":
        "Une assurance-vie suit ses propres règles, en dehors de votre testament. Un notaire doit regarder votre situation avec vous.",
      "legal-entity-beneficiary":
        "Laisser quelque chose à une association, une fondation ou un autre organisme suit des règles particulières. Un notaire doit s'en occuper.",
      "minor-or-protected-person":
        "Quand une personne est mineure ou protégée, des règles particulières s'appliquent. Un professionnel doit vous accompagner.",
      "minor-or-protected-person_testator-protected":
        "Vous êtes sous une mesure de protection : vos volontés obéissent à des règles particulières. Un professionnel doit vous accompagner.",
      "minor-or-protected-person_minor-child":
        "Vous avez un enfant de moins de 18 ans : des règles particulières le protègent. Un notaire doit vous accompagner.",
      "minor-or-protected-person_minor-beneficiary":
        "Une personne désignée a moins de 18 ans : des règles particulières la protègent. Un notaire doit vous accompagner.",
      "blended-family":
        "Quand les enfants sont nés d'unions différentes, le partage devient plus délicat. Un notaire doit regarder votre situation avec vous.",
      "body-wishes":
        "Le don d'organes ou du corps suit des règles précises. Parlez-en à un professionnel ou à l'organisme concerné.",
      "conditional-clause":
        "Une volonté qui dépend d'une condition ou impose une obligation doit être rédigée avec soin. Un notaire doit la rédiger avec vous.",
      "conditional-clause_condition":
        "Une de vos volontés dépend d'une condition. Elle doit être rédigée avec soin : un notaire doit la rédiger avec vous.",
      "conditional-clause_charge":
        "Une de vos volontés impose une obligation à la personne qui reçoit. Elle doit être rédigée avec soin : un notaire doit la rédiger avec vous.",
    },
  },

  review: {
    title: "Faire le point",
    intro:
      "Voici où vous en êtes, partie par partie. Ce n'est qu'un contrôle de ce qui manque : rien n'est vérifié par un professionnel.",
    summaryTitle: "En un coup d'œil",
    objects: {
      draft: "Brouillon de testament",
      wishes: "Mes volontés",
      record: "Mon testament écrit à la main",
    },
    allComplete:
      "Tout est complet selon notre checklist. Ce n'est pas un avis juridique : ce que vous avez écrit n'a pas été vérifié par un professionnel.",
    somethingMissing:
      "Il reste des réponses à donner. Chaque partie ci-dessous vous dit précisément lesquelles.",
    noFindings: "Rien à signaler pour cette partie.",
    notStarted: "Vous n'avez pas encore commencé cette partie.",
    levelLabel: "État",
    legend: {
      title: "Que veulent dire ces étiquettes ?",
      complete: "Toutes les informations demandées sont renseignées.",
      incomplete:
        "Il manque des réponses. Rien de grave : il suffit de répondre aux questions listées.",
      professional:
        "Votre situation dépend de règles que Veille ne peut pas trancher. Un notaire doit vous aider.",
      notStarted: "Vous n'avez pas encore ouvert cette partie.",
    },
    progress: "{{done}} réponses sur {{total}}",
    meterLabel: "Réponses données",
    toAnswer: {
      title: "Réponses manquantes : {{count}}",
      hint: "Répondre à ces questions suffit à compléter cette partie.",
      action: "Répondre",
      actionFor: "Répondre à : {{question}}",
      more: "Voir les {{count}} autres questions",
    },
    toCheck: {
      title: "À vérifier",
      hint: "Ces points demandent un coup d'œil de votre part.",
    },
    blocking: {
      title: "À voir avec un professionnel",
      hint: "Vous pouvez modifier votre réponse, mais seul un notaire peut dire ce qui est possible dans votre situation.",
    },
    continue: "Continuer cette partie",
    notary: {
      title: "Dernière étape : faire relire chez un notaire",
      recommended:
        "Même quand tout est complet, la meilleure précaution est de montrer votre texte à un notaire, ou de le lui confier. Il peut aussi l'inscrire au fichier central des dispositions de dernières volontés.",
      required:
        "Pour la partie signalée, vous devez voir un notaire avant d'aller plus loin : Veille ne peut pas vous dire ce qui est possible dans votre situation. Prenez rendez-vous, et emportez ces informations.",
    },
    blockedExport:
      "Le texte à recopier ne peut pas être préparé tant qu'une situation demande un professionnel.",
    toExport: "Obtenir mes documents (PDF)",
    toHub: "Retour à mon document de legs",
  },

  export: {
    title: "Mes documents (PDF)",
    intro:
      "Ce sont deux documents séparés, pour deux usages différents. Ils ne sont jamais réunis en un seul.",
    plaintextWarning:
      "Attention : un fichier PDF n'est pas protégé par votre code. Une fois téléchargé, il est enregistré tel quel sur votre appareil et peut être lu par toute personne qui y a accès. Supprimez-le quand vous n'en avez plus besoin.",
    draft: {
      title: "Brouillon de testament à recopier à la main",
      body: "Le texte à recopier, avec la marche à suivre. Ce n'est pas un testament tant que vous ne l'avez pas recopié à la main, daté et signé.",
      download: "Télécharger le brouillon à recopier (PDF)",
    },
    wishes: {
      title: "Document de volontés",
      body: "Vos souhaits et vos messages, pour vos proches. Ce n'est pas un testament.",
      download: "Télécharger mes volontés (PDF)",
    },
    notAvailable:
      "Ce document n'est pas disponible tant que cette partie n'est pas complète selon notre checklist.",
    blocked: "Ce document n'est pas disponible : cette partie demande l'avis d'un professionnel.",
    seeReview: "Voir ce qui manque",
    done: "Document préparé. Il a été enregistré dans l'historique des versions.",
  },

  history: {
    title: "Historique des versions",
    intro:
      "Chaque fois que vous terminez une partie ou préparez un PDF, une version est conservée. Rien n'est effacé : vous pouvez relire les versions précédentes.",
    integrity:
      "L'empreinte permet de voir si une version a été modifiée. Elle ne constitue pas une preuve juridique.",
    empty: "Aucune version pour le moment. Une version est créée quand vous terminez une partie.",
    version: "Version {{n}} — {{date}}",
    fingerprint: "Empreinte : {{value}}",
    show: "Voir le contenu de cette version",
    objects: {
      draft: "Brouillon de testament",
      wishes: "Mes volontés",
      record: "Mon testament écrit à la main",
    },
    summary: {
      testatorFullName: "Nom",
      beneficiaries: "Personnes désignées",
      provisions: "Volontés",
      funeralWishes: "Obsèques",
      messages: "Messages",
      papers: "Papiers",
      existence: "Testament écrit à la main",
      location: "Emplacement",
      none: "—",
      existsYes: "Oui",
      existsNo: "Non",
      existsUnknown: "Non précisé",
    },
  },

  pdf: {
    evaluationHeader: "Veille - version d'évaluation - ne pas utiliser comme un vrai document",
    pageLabel: "Page {n} sur {total}",
    draft: {
      title: "Brouillon de testament à recopier à la main",
      howToTitle: "Comment procéder",
      textTitle: "Texte à recopier",
      textIntro:
        "Recopiez ce qui suit en entier, à la main, sur une feuille. Vous pouvez adapter les mots, mais gardez le sens.",
      opening:
        "Ceci est mon testament. Je, soussigné(e) {{name}}, exprime ici mes dernières volontés.",
      bequest: "{{number}}. Je laisse à {{beneficiary}} : {{subject}}.",
      closing:
        "À la fin, écrivez de votre main le lieu et la date, puis signez. Ne signez pas ce document imprimé.",
    },
    wishes: {
      title: "Document de volontés",
      notAWill:
        "Ce document exprime des souhaits. Ce n'est pas un testament et il ne produit aucun effet juridique par lui-même.",
      funeral: "Mes souhaits pour mes obsèques",
      messages: "Mes messages",
      messageTo: "Pour : {{recipient}}",
      papers: "Où trouver mes papiers",
      paperLine: "{{label}} : {{location}}",
    },
  },
} as const;
