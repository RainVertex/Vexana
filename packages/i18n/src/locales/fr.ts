import type { ShellResources } from "./en";

export const fr: ShellResources = {
  common: {
    loading: "Chargement…",
    adminOnly: "Administrateurs uniquement.",
    active: "Actif",
  },
  auth: {
    tagline:
      "Outil interne pour notre organisation d'ingénierie. Connectez-vous avec GitHub pour continuer.",
    signInWithGithub: "Se connecter avec GitHub",
    orgRequirement:
      "Vous devez être membre de notre organisation GitHub pour accéder à la plateforme.",
    errorGeneric: "Échec de la connexion. Veuillez réessayer.",
    errorNotInOrg: "Vous n'êtes pas membre de l'organisation.",
    errorBadOauthState: "Le lien de connexion a expiré ou a été altéré. Veuillez réessayer.",
    errorAccountDisabled: "Votre compte a été désactivé. Contactez un administrateur.",
  },
  nav: {
    home: "Accueil",
    chat: "Assistant",
    catalog: "Catalogue",
    selfservice: "Libre-service",
    requests: "Demandes",
    workspace: "Projets",
    agents: "Agents",
    teams: "Équipes",
    observability: "Observabilité",
    integrations: "Intégrations",
    admin: "Administration",
    settings: "Paramètres",
    pin: "Épingler",
    unpin: "Détacher",
    pinSidebar: "Épingler la barre latérale",
    unpinSidebar: "Détacher la barre latérale",
    pendingBadge: "{{label}} ({{count}} en attente)",
  },
  header: {
    openSettings: "Ouvrir les paramètres",
  },
  home: {
    welcome: "Bon retour, {{name}}",
    subtitle: "Votre tableau de bord Vexana en un coup d'œil.",
    emptyTitle: "Aucun widget sur votre page d'accueil",
    emptyHint: 'Passez en mode édition et cliquez sur "Ajouter un widget" pour commencer.',
  },
  settings: {
    title: "Paramètres",
    description: "Vos préférences de profil et d'apparence.",
    profileTitle: "Profil",
    profileDescription: "Provenant de votre compte GitHub.",
    appearanceTitle: "Apparence",
    appearanceDescription: "Choisissez un thème. Votre choix est enregistré dans ce navigateur.",
    languageTitle: "Langue",
    languageDescription: "Choisissez une langue. Votre choix est enregistré dans ce navigateur.",
    themeLabel: "Thème",
  },
  profile: {
    roleAdmin: "Administrateur",
    roleMember: "Membre",
    roleViewer: "Lecteur",
    fieldDisplayName: "Nom affiché",
    fieldEmail: "E-mail",
    fieldGithub: "GitHub",
    fieldRole: "Rôle",
    fieldLastLogin: "Dernière connexion",
    fieldStatus: "Statut",
    sourcedNote:
      "Votre nom, votre e-mail et votre avatar proviennent de GitHub. Pour les modifier, mettez à jour votre profil GitHub. Les changements de rôle sont gérés par un administrateur.",
    signOut: "Se déconnecter",
  },
  forbidden: {
    title: "Accès refusé",
    body: "Vous devez avoir le rôle <strong>administrateur</strong> pour voir cette page.",
  },
  admin: {
    usersTitle: "Utilisateurs",
    usersManage: "Gérez qui peut accéder à la plateforme.",
    usersDeleteConfirm:
      "Supprimer {{name}} (@{{login}}) définitivement ? Cette action est irréversible.",
    aiModelsTitle: "IA / Modèles",
    aiModelsDescription:
      "Modèles pris en charge, disponibilité des fournisseurs et modèle de discussion actif. L'assistant reste indisponible jusqu'à ce que vous sélectionniez un modèle compatible avec les outils auprès d'un fournisseur prêt.",
    auditTitle: "Journal d'audit",
    auditDescription: "Actions privilégiées récentes sur la plateforme.",
    jobsTitle: "Tâches",
    jobsDescription: "Planificateur en arrière-plan. Ce qui s'exécute, ce qui a échoué et quand.",
    mcpTokensTitle: "Jetons MCP",
    mcpTokensDescription: "Jetons porteurs pour les agents externes appelant /mcp/scaffolder.",
    auditEmpty: "Aucun événement correspondant.",
    jobsEmpty: "Aucune tâche enregistrée.",
    mcpTokensEmpty: "Aucun jeton MCP émis pour le moment.",
  },
  themes: {
    light: { label: "Clair", description: "Valeur par défaut propre et lumineuse." },
    ocean: { label: "Océan", description: "Bleus froids et touches de turquoise." },
    nordic: {
      label: "Nordique",
      description: "Bleus froids désaturés. Reposant pour les yeux.",
    },
    sandstone: {
      label: "Grès",
      description: "Terre cuite chaude sur beige doux.",
    },
    parchment: {
      label: "Parchemin",
      description: "Papier crème avec brun profond. Conçu pour la lecture.",
    },
    sunset: { label: "Coucher de soleil", description: "Oranges chauds et accents roses." },
    rose: { label: "Rose", description: "Roses doux avec une touche de magenta." },
    dark: { label: "Sombre", description: "Reposant pour les yeux lors de longues sessions." },
    midnight: {
      label: "Minuit",
      description: "Indigo profond avec des accents violets.",
    },
  },
};
