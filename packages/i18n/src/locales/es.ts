import type { ShellResources } from "./en";

export const es: ShellResources = {
  common: {
    loading: "Cargando…",
    adminOnly: "Solo administradores.",
    active: "Activo",
  },
  auth: {
    tagline:
      "Herramienta interna para nuestra organización de ingeniería. Inicia sesión con GitHub para continuar.",
    signInWithGithub: "Iniciar sesión con GitHub",
    orgRequirement:
      "Debes ser miembro de nuestra organización de GitHub para acceder a la plataforma.",
    errorGeneric: "Error al iniciar sesión. Inténtalo de nuevo.",
    errorNotInOrg: "No eres miembro de la organización.",
    errorBadOauthState:
      "El enlace de inicio de sesión caducó o fue manipulado. Inténtalo de nuevo.",
    errorAccountDisabled: "Tu cuenta ha sido deshabilitada. Contacta con un administrador.",
  },
  nav: {
    home: "Inicio",
    chat: "Asistente",
    catalog: "Catálogo",
    selfservice: "Autoservicio",
    requests: "Solicitudes",
    workspace: "Proyectos",
    agents: "Agentes",
    teams: "Equipos",
    observability: "Observabilidad",
    integrations: "Integraciones",
    admin: "Administración",
    settings: "Configuración",
    pin: "Fijar",
    unpin: "Desfijar",
    pinSidebar: "Fijar la barra lateral",
    unpinSidebar: "Desfijar la barra lateral",
    pendingBadge: "{{label}} ({{count}} pendientes)",
  },
  header: {
    openSettings: "Abrir configuración",
  },
  home: {
    welcome: "Bienvenido de nuevo, {{name}}",
    subtitle: "Tu panel de Vexana de un vistazo.",
    emptyTitle: "No hay widgets en tu página de inicio",
    emptyHint: 'Entra en el modo de edición y haz clic en "Agregar widget" para comenzar.',
  },
  settings: {
    title: "Configuración",
    description: "Tus preferencias de perfil y apariencia.",
    profileTitle: "Perfil",
    profileDescription: "Obtenido de tu cuenta de GitHub.",
    appearanceTitle: "Apariencia",
    appearanceDescription: "Elige un tema. Tu elección se guarda en este navegador.",
    languageTitle: "Idioma",
    languageDescription: "Elige un idioma. Tu elección se guarda en este navegador.",
    themeLabel: "Tema",
  },
  profile: {
    roleAdmin: "Administrador",
    roleMember: "Miembro",
    roleViewer: "Observador",
    fieldDisplayName: "Nombre visible",
    fieldEmail: "Correo electrónico",
    fieldGithub: "GitHub",
    fieldRole: "Rol",
    fieldLastLogin: "Último inicio de sesión",
    fieldStatus: "Estado",
    sourcedNote:
      "Tu nombre, correo electrónico y avatar provienen de GitHub. Para cambiarlos, actualiza tu perfil de GitHub. Los cambios de rol los gestiona un administrador.",
    signOut: "Cerrar sesión",
  },
  forbidden: {
    title: "Acceso denegado",
    body: "Necesitas el rol de <strong>administrador</strong> para ver esta página.",
  },
  admin: {
    usersTitle: "Usuarios",
    usersManage: "Gestiona quién puede acceder a la plataforma.",
    usersDeleteConfirm:
      "¿Eliminar a {{name}} (@{{login}}) de forma permanente? Esta acción no se puede deshacer.",
    aiModelsTitle: "IA / Modelos",
    aiModelsDescription:
      "Modelos compatibles, disponibilidad del proveedor y el modelo de chat activo. El asistente permanece no disponible hasta que selecciones un modelo compatible con herramientas de un proveedor listo.",
    auditTitle: "Registro de auditoría",
    auditDescription: "Acciones privilegiadas recientes en la plataforma.",
    jobsTitle: "Trabajos",
    jobsDescription: "Programador en segundo plano. Qué se está ejecutando, qué falló y cuándo.",
    mcpTokensTitle: "Tokens MCP",
    mcpTokensDescription: "Tokens de portador para agentes externos que llaman a /mcp/scaffolder.",
    auditEmpty: "No hay eventos coincidentes.",
    jobsEmpty: "No hay trabajos registrados.",
    mcpTokensEmpty: "Aún no se han emitido tokens MCP.",
  },
  themes: {
    light: { label: "Claro", description: "Predeterminado limpio y luminoso." },
    ocean: { label: "Océano", description: "Azules fríos y toques turquesa." },
    nordic: {
      label: "Nórdico",
      description: "Azules fríos desaturados. Descansa la vista.",
    },
    sandstone: {
      label: "Arenisca",
      description: "Terracota cálida sobre tostado suave.",
    },
    parchment: {
      label: "Pergamino",
      description: "Papel crema con marrón intenso. Pensado para leer.",
    },
    sunset: { label: "Atardecer", description: "Naranjas cálidos y acentos rosados." },
    rose: { label: "Rosa", description: "Rosas suaves con un toque magenta." },
    dark: { label: "Oscuro", description: "Descansa la vista en sesiones largas." },
    midnight: {
      label: "Medianoche",
      description: "Índigo profundo con acentos violetas.",
    },
  },
};
