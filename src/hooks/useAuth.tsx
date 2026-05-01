import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";

export interface ProfileSummary {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  low_bandwidth: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileSummary | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, bio, low_bandwidth")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("loadProfile error", error);
    return null;
  }
  return data as ProfileSummary | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  const apply = React.useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ session: null, user: null, profile: null, loading: false });
      return;
    }
    const profile = await loadProfile(session.user.id);
    setState({ session, user: session.user, profile, loading: false });
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => apply(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [apply]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = React.useCallback(
    async ({ email, password, fullName, role }: { email: string; password: string; fullName: string; role: UserRole }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    setState((s) => ({ ...s, profile }));
  }, [state.user]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signUp, signOut, refreshProfile }),
    [state, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function dashboardPathFor(role: UserRole): string {
  switch (role) {
    case "tutor":   return "/tutor";
    case "admin":   return "/admin";
    case "student":
    default:        return "/student";
  }
}
