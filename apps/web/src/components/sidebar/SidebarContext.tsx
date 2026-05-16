import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocation } from "react-router-dom";
import { sectionFromPath, sectionHasTree, type SidebarSection } from "./sectionFromPath";
import type { PageSection } from "@internal/shared-types";

const PIN_STORAGE_KEY = "mep:sidebar-pinned";
const HOVER_DELAY_MS = 150;

function readPinned(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PIN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

interface SidebarContextValue {
  pinned: boolean;
  setPinned: (next: boolean) => void;
  togglePinned: () => void;
  peeking: boolean;
  /** True when the rail should render in its expanded (labels-visible) form. */
  expanded: boolean;
  onRailMouseEnter: () => void;
  onRailMouseLeave: () => void;
  activeSection: SidebarSection;
  /** Lets a child route (e.g. */
  setRouteSection: (section: PageSection | null) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: PropsWithChildren) {
  const [pinned, setPinnedState] = useState<boolean>(() => readPinned());
  const [peeking, setPeeking] = useState(false);
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const location = useLocation();

  // The pure URL-derived section. Returns "home" for routes like `/p/:id` that
  // aren't bound to a specific section in their path.
  const pathSection = useMemo(() => sectionFromPath(location.pathname), [location.pathname]);

  // Last section that owned a tree. Stays "sticky" so navigating into a
  // dashboard page (`/p/:id`) keeps showing the tree the user was in. Persisted
  // to survive reloads.
  const [stickySection, setStickySection] = useState<PageSection>(() => {
    if (typeof window === "undefined") return "catalog";
    try {
      const raw = window.localStorage.getItem("mep:sidebar-last-tree-section");
      if (raw && raw !== "home" && raw !== "account") return raw as PageSection;
    } catch {
      // ignore
    }
    return "catalog";
  });

  // Explicit override set by a route component (DashboardPage uses this so
  // deep-links to `/p/:id` show the right tree once the page resolves).
  const [routeSection, setRouteSection] = useState<PageSection | null>(null);

  // Track the last tree-having section the user navigated to via the URL.
  useEffect(() => {
    if (sectionHasTree(pathSection)) {
      setStickySection(pathSection);
      try {
        window.localStorage.setItem("mep:sidebar-last-tree-section", pathSection);
      } catch {
        // ignore
      }
    }
  }, [pathSection]);

  // Resolve to: explicit route override → URL section if it has a tree → sticky.
  const activeSection: SidebarSection = useMemo(() => {
    if (routeSection) return routeSection;
    if (sectionHasTree(pathSection)) return pathSection;
    if (pathSection === "account") return pathSection;
    if (location.pathname.startsWith("/p/")) return stickySection;
    return pathSection;
  }, [routeSection, pathSection, stickySection, location.pathname]);

  // Reset the route override whenever the user navigates somewhere else, so the
  // next dashboard page gets a clean slate to set its own.
  useEffect(() => {
    if (!location.pathname.startsWith("/p/")) setRouteSection(null);
  }, [location.pathname]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, pinned ? "true" : "false");
    } catch {
      // ignore persistence failure
    }
  }, [pinned]);

  const clearTimers = useCallback(() => {
    if (enterTimer.current != null) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const onRailMouseEnter = useCallback(() => {
    if (pinned) return;
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (peeking) return;
    enterTimer.current = window.setTimeout(() => setPeeking(true), HOVER_DELAY_MS);
  }, [pinned, peeking]);

  const onRailMouseLeave = useCallback(() => {
    if (pinned) return;
    if (enterTimer.current != null) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    leaveTimer.current = window.setTimeout(() => setPeeking(false), HOVER_DELAY_MS);
  }, [pinned]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const togglePinned = useCallback(() => {
    setPinnedState((prev) => {
      const next = !prev;
      // Pinning while peeking shouldn't leave the overlay flag stuck on.
      if (next) setPeeking(false);
      return next;
    });
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      pinned,
      setPinned: setPinnedState,
      togglePinned,
      peeking,
      expanded: pinned || peeking,
      onRailMouseEnter,
      onRailMouseLeave,
      activeSection,
      setRouteSection,
    }),
    [pinned, togglePinned, peeking, onRailMouseEnter, onRailMouseLeave, activeSection],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}
