import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { tokenStore } from "@/api/client";
import { getMyOrg, login as loginRequest } from "@/api/endpoints";
import { unregisterAlarmPush } from "@/push";
import { disconnectWs } from "@/ws/stomp";
import type { OrgSummary, TokenPair, UserSummary } from "@/types";

// SecureStore caps values (~2KB on Android), so tokens and profile are split.
const K_ACCESS = "motolink.access";
const K_REFRESH = "motolink.refresh";
const K_PROFILE = "motolink.profile";

type Status = "loading" | "authed" | "anon";

interface Profile {
  user: UserSummary;
  org: OrgSummary;
}

interface AuthState {
  status: Status;
  user: UserSummary | null;
  org: OrgSummary | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function persistTokens(pair: TokenPair): Promise<void> {
  await SecureStore.setItemAsync(K_ACCESS, pair.accessToken);
  await SecureStore.setItemAsync(K_REFRESH, pair.refreshToken);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const bound = useRef(false);

  // Wire the axios token store to persistence + forced sign-out exactly once.
  if (!bound.current) {
    bound.current = true;
    tokenStore.bind({
      onTokens: (pair) => {
        void persistTokens(pair);
      },
      onAuthLost: () => {
        void doSignOut();
      },
    });
  }

  // Org settings (e.g. the Google Maps key) can change on the dashboard while
  // the app is logged in, so re-read them whenever a session starts.
  async function refreshOrg(): Promise<void> {
    try {
      const org = await getMyOrg();
      setProfile((prev) => {
        if (!prev) return prev;
        const next: Profile = { user: prev.user, org: { ...prev.org, ...org } };
        void SecureStore.setItemAsync(K_PROFILE, JSON.stringify(next));
        return next;
      });
    } catch {
      // Offline or stale token: keep the persisted profile.
    }
  }

  async function doSignOut(): Promise<void> {
    // Best-effort; needs the auth header, so it must run before tokens clear.
    await unregisterAlarmPush();
    tokenStore.clear();
    disconnectWs();
    await Promise.all([
      SecureStore.deleteItemAsync(K_ACCESS),
      SecureStore.deleteItemAsync(K_REFRESH),
      SecureStore.deleteItemAsync(K_PROFILE),
    ]);
    setProfile(null);
    setStatus("anon");
  }

  useEffect(() => {
    (async () => {
      try {
        const [access, refresh, profileJson] = await Promise.all([
          SecureStore.getItemAsync(K_ACCESS),
          SecureStore.getItemAsync(K_REFRESH),
          SecureStore.getItemAsync(K_PROFILE),
        ]);
        if (access && refresh && profileJson) {
          tokenStore.set({ accessToken: access, refreshToken: refresh });
          setProfile(JSON.parse(profileJson) as Profile);
          setStatus("authed");
          void refreshOrg();
        } else {
          setStatus("anon");
        }
      } catch {
        setStatus("anon");
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user: profile?.user ?? null,
      org: profile?.org ?? null,
      async signIn(email, password) {
        const res = await loginRequest(email.trim(), password);
        tokenStore.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        const prof: Profile = { user: res.user, org: res.org };
        await persistTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        await SecureStore.setItemAsync(K_PROFILE, JSON.stringify(prof));
        setProfile(prof);
        setStatus("authed");
        void refreshOrg();
      },
      signOut: doSignOut,
    }),
    [status, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
