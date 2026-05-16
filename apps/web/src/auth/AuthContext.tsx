import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useApi } from "@internal/api-client/react";
import type { CurrentUser } from "@internal/shared-types";

export type AuthStatus = "loading" | "signed-in" | "signed-out";

interface AuthContextValue {
  user: CurrentUser | null;
  status: AuthStatus;
  signIn: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useApi();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const me = await client.auth.me();
      if (me) {
        setUser(me);
        setStatus("signed-in");
      } else {
        setUser(null);
        setStatus("signed-out");
      }
    } catch {
      setUser(null);
      setStatus("signed-out");
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(() => {
    window.location.href = client.auth.signInUrl();
  }, [client]);

  const signOut = useCallback(async () => {
    try {
      await client.auth.logout();
    } finally {
      setUser(null);
      setStatus("signed-out");
    }
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut, refresh }),
    [user, status, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser used outside a signed-in context");
  return user;
}
