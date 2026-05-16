export type ThemeId =
  | "light"
  | "ocean"
  | "nordic"
  | "sandstone"
  | "parchment"
  | "sunset"
  | "rose"
  | "dark"
  | "midnight";

export type ThemeCategory = "light" | "dark";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  category: ThemeCategory;
  swatch: {
    bg: string;
    surface: string;
    primary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
  };
}

export const THEMES: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    description: "Clean and bright default.",
    category: "light",
    swatch: {
      bg: "#f8fafc",
      surface: "#ffffff",
      primary: "#2563eb",
      accent: "#8b5cf6",
      success: "#16a34a",
      warning: "#d97706",
      danger: "#ef4444",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool blues and teal highlights.",
    category: "light",
    swatch: {
      bg: "#eff8fd",
      surface: "#ffffff",
      primary: "#0891b2",
      accent: "#0ea5e9",
      success: "#0d9488",
      warning: "#d97706",
      danger: "#dc2626",
    },
  },
  {
    id: "nordic",
    label: "Nordic",
    description: "Desaturated cool blues. Easy on the eyes.",
    category: "light",
    swatch: {
      bg: "#eceff4",
      surface: "#ffffff",
      primary: "#5e81ac",
      accent: "#88c0d0",
      success: "#a3be8c",
      warning: "#ebcb8b",
      danger: "#bf616a",
    },
  },
  {
    id: "sandstone",
    label: "Sandstone",
    description: "Warm terracotta on soft tan.",
    category: "light",
    swatch: {
      bg: "#faf6f0",
      surface: "#ffffff",
      primary: "#c2410c",
      accent: "#d97706",
      success: "#65a30d",
      warning: "#ca8a04",
      danger: "#b91c1c",
    },
  },
  {
    id: "parchment",
    label: "Parchment",
    description: "Cream paper with deep brown. Built for reading.",
    category: "light",
    swatch: {
      bg: "#f5ecd8",
      surface: "#fdf6e3",
      primary: "#8b4513",
      accent: "#b8860b",
      success: "#5b7a2a",
      warning: "#b8860b",
      danger: "#993333",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm oranges and pink accents.",
    category: "light",
    swatch: {
      bg: "#fff7ed",
      surface: "#ffffff",
      primary: "#ea580c",
      accent: "#db2777",
      success: "#16a34a",
      warning: "#d97706",
      danger: "#b91c1c",
    },
  },
  {
    id: "rose",
    label: "Rose",
    description: "Soft pinks with magenta pop.",
    category: "light",
    swatch: {
      bg: "#fdf2f8",
      surface: "#ffffff",
      primary: "#e11d48",
      accent: "#c026d3",
      success: "#16a34a",
      warning: "#d97706",
      danger: "#dc2626",
    },
  },
  {
    id: "dark",
    label: "Dark",
    description: "Easy on the eyes for long sessions.",
    category: "dark",
    swatch: {
      bg: "#0b1020",
      surface: "#111827",
      primary: "#60a5fa",
      accent: "#a78bfa",
      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#f87171",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep indigo with violet accents.",
    category: "dark",
    swatch: {
      bg: "#050814",
      surface: "#0b1226",
      primary: "#8b5cf6",
      accent: "#22d3ee",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#fb7185",
    },
  },
];

export const DEFAULT_THEME: ThemeId = "light";
export const THEME_STORAGE_KEY = "mep:theme";
export const VALID_THEME_IDS = new Set<ThemeId>(THEMES.map((t) => t.id));
