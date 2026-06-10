import type { ShellResources } from "./en";

export const de: ShellResources = {
  common: {
    loading: "Wird geladen…",
    adminOnly: "Nur für Administratoren.",
    active: "Aktiv",
  },
  auth: {
    tagline:
      "Internes Werkzeug für unsere Engineering-Organisation. Melden Sie sich mit GitHub an, um fortzufahren.",
    signInWithGithub: "Mit GitHub anmelden",
    orgRequirement:
      "Sie müssen Mitglied unserer GitHub-Organisation sein, um auf die Plattform zuzugreifen.",
    errorGeneric: "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    errorNotInOrg: "Sie sind kein Mitglied der Organisation.",
    errorBadOauthState:
      "Der Anmeldelink ist abgelaufen oder wurde manipuliert. Bitte versuchen Sie es erneut.",
    errorAccountDisabled: "Ihr Konto wurde deaktiviert. Wenden Sie sich an einen Administrator.",
  },
  nav: {
    home: "Start",
    chat: "Assistent",
    catalog: "Katalog",
    selfservice: "Self-Service",
    requests: "Anfragen",
    workspace: "Projekte",
    agents: "Agenten",
    teams: "Teams",
    observability: "Observability",
    integrations: "Integrationen",
    admin: "Verwaltung",
    settings: "Einstellungen",
    pin: "Anheften",
    unpin: "Lösen",
    pinSidebar: "Seitenleiste anheften",
    unpinSidebar: "Seitenleiste lösen",
    pendingBadge: "{{label}} ({{count}} ausstehend)",
  },
  header: {
    openSettings: "Einstellungen öffnen",
  },
  home: {
    welcome: "Willkommen zurück, {{name}}",
    subtitle: "Ihr Vexana-Dashboard auf einen Blick.",
    emptyTitle: "Keine Widgets auf Ihrer Startseite",
    emptyHint:
      'Wechseln Sie in den Bearbeitungsmodus und klicken Sie auf "Widget hinzufügen", um zu beginnen.',
  },
  settings: {
    title: "Einstellungen",
    description: "Ihre Profil- und Darstellungseinstellungen.",
    profileTitle: "Profil",
    profileDescription: "Stammt aus Ihrem GitHub-Konto.",
    appearanceTitle: "Darstellung",
    appearanceDescription:
      "Wählen Sie ein Design. Ihre Auswahl wird in diesem Browser gespeichert.",
    languageTitle: "Sprache",
    languageDescription:
      "Wählen Sie eine Sprache. Ihre Auswahl wird in diesem Browser gespeichert.",
    themeLabel: "Design",
  },
  profile: {
    roleAdmin: "Administrator",
    roleMember: "Mitglied",
    roleViewer: "Betrachter",
    fieldDisplayName: "Anzeigename",
    fieldEmail: "E-Mail",
    fieldGithub: "GitHub",
    fieldRole: "Rolle",
    fieldLastLogin: "Letzte Anmeldung",
    fieldStatus: "Status",
    sourcedNote:
      "Ihr Name, Ihre E-Mail und Ihr Avatar stammen von GitHub. Um sie zu ändern, aktualisieren Sie Ihr GitHub-Profil. Rollenänderungen werden von einem Administrator vorgenommen.",
    signOut: "Abmelden",
  },
  forbidden: {
    title: "Zugriff verweigert",
    body: "Sie benötigen die Rolle <strong>Administrator</strong>, um diese Seite anzuzeigen.",
  },
  admin: {
    usersTitle: "Benutzer",
    usersManage: "Verwalten Sie, wer auf die Plattform zugreifen kann.",
    usersDeleteConfirm:
      "{{name}} (@{{login}}) dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.",
    aiModelsTitle: "KI / Modelle",
    aiModelsDescription:
      "Unterstützte Modelle, Anbieterbereitschaft und das aktive Chat-Modell. Der Assistent bleibt nicht verfügbar, bis Sie ein werkzeugfähiges Modell von einem bereiten Anbieter auswählen.",
    auditTitle: "Audit-Protokoll",
    auditDescription: "Letzte privilegierte Aktionen auf der Plattform.",
    jobsTitle: "Jobs",
    jobsDescription: "Hintergrund-Scheduler. Was läuft, was fehlgeschlagen ist und wann.",
    mcpTokensTitle: "MCP-Token",
    mcpTokensDescription: "Bearer-Token für externe Agenten, die /mcp/scaffolder aufrufen.",
    auditEmpty: "Keine passenden Ereignisse.",
    jobsEmpty: "Keine Jobs registriert.",
    mcpTokensEmpty: "Noch keine MCP-Token ausgestellt.",
  },
  themes: {
    light: { label: "Hell", description: "Sauberer und heller Standard." },
    ocean: { label: "Ozean", description: "Kühle Blautöne und türkise Akzente." },
    nordic: {
      label: "Nordisch",
      description: "Entsättigte kühle Blautöne. Schonend für die Augen.",
    },
    sandstone: {
      label: "Sandstein",
      description: "Warmes Terrakotta auf weichem Sandton.",
    },
    parchment: {
      label: "Pergament",
      description: "Cremefarbenes Papier mit tiefem Braun. Für das Lesen gemacht.",
    },
    sunset: { label: "Sonnenuntergang", description: "Warme Orangetöne und rosa Akzente." },
    rose: { label: "Rosé", description: "Sanfte Rosatöne mit einem Hauch von Magenta." },
    dark: { label: "Dunkel", description: "Schonend für die Augen bei langen Sitzungen." },
    midnight: {
      label: "Mitternacht",
      description: "Tiefes Indigo mit violetten Akzenten.",
    },
  },
};
