import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { tokenStore } from "@/api/client";
import { getMe, getMyOrg, login as loginRequest } from "@/api/endpoints";
import { unregisterAlarmPush } from "@/push";
import { disconnectWs } from "@/ws/stomp";
import type { OrgSummary, TokenPair, UserSummary } from "@/types";

// SecureStore caps values (~2KB on Android), so tokens and profile are split.
const K_ACCESS = "eyeon.access";
const K_REFRESH = "eyeon.refresh";
const K_PROFILE = "eyeon.profile";

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

// Refresh token first: if the app dies between the two writes, a stale access token only costs
// one 401 and a refresh, while a stale refresh token used to cost the session.
async function persistTokens(pair: TokenPair): Promise<void> {
  await SecureStore.setItemAsync(K_REFRESH, pair.refreshToken);
  await SecureStore.setItemAsync(K_ACCESS, pair.accessToken);
}

/** SecureStore reads can fail transiently on Android (keystore busy right after boot); retry. */
async function readStore(key: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  return SecureStore.getItemAsync(key);
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Further rounds of reading the tokens when the store keeps throwing, and the wait before each. */
const TOKEN_READ_WAITS_MS = [2_000, 4_000, 6_000];

/**
 * The saved tokens, or nulls when none are saved. Throws only when the store cannot be read at
 * all (about 20 s of attempts): until 2026-11-17 the first exception showed the login screen
 * although the tokens were still there.
 */
async function readTokens(): Promise<{ access: string | null; refresh: string | null }> {
  for (let round = 0; ; round++) {
    try {
      const [access, refresh] = await Promise.all([readStore(K_ACCESS), readStore(K_REFRESH)]);
      return { access, refresh };
    } catch (e) {
      if (round >= TOKEN_READ_WAITS_MS.length) throw e;
      await wait(TOKEN_READ_WAITS_MS[round]);
    }
  }
}

/** The saved profile, or null when it is missing, unreadable or not a profile. */
async function readProfile(): Promise<Profile | null> {
  try {
    const json = await readStore(K_PROFILE);
    if (!json) return null;
    const p = JSON.parse(json) as Partial<Profile> | null;
    return p && typeof p === "object" && p.user && p.org ? { user: p.user, org: p.org } : null;
  } catch {
    return null;
  }
}

/**
 * True when the server itself refused the profile request (the account is disabled or gone), as
 * opposed to not being reachable. A 401 is not listed: the API client deals with it and ends the
 * session itself when the refresh token is refused.
 */
function isRefusal(e: unknown): boolean {
  if (!axios.isAxiosError(e) || !e.response) return false;
  const s = e.response.status;
  return s >= 400 && s < 500 && s !== 401 && s !== 408 && s !== 429;
}

/** Waits between attempts to rebuild a lost profile while the server cannot be reached; the last one repeats. */
const PROFILE_RETRY_MS = [5_000, 15_000, 30_000, 60_000];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const bound = useRef(false);
  // Signed in from saved tokens while the saved profile was lost and the server could not be
  // asked for it yet (offline start): tried again on a timer and when the app comes forward.
  const profileMissing = useRef(false);
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileTries = useRef(0);
  const profileBusy = useRef(false);

  function stopProfileRebuild(): void {
    profileMissing.current = false;
    profileTries.current = 0;
    if (profileTimer.current) clearTimeout(profileTimer.current);
    profileTimer.current = null;
  }

  // Wire the axios token store to persistence + forced sign-out exactly once.
  if (!bound.current) {
    bound.current = true;
    tokenStore.bind({
      onTokens: (pair) => persistTokens(pair),
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

  /** Ask the server who is signed in. "offline" = no answer; "refused" = the session or account is gone. */
  async function rebuildProfile(): Promise<"ok" | "offline" | "refused"> {
    try {
      const [user, org] = await Promise.all([getMe(), getMyOrg()]);
      if (!tokenStore.hasSession()) return "refused"; // signed out meanwhile
      const prof: Profile = { user, org };
      setProfile(prof);
      // A failed write only means the profile is asked for again at the next start.
      SecureStore.setItemAsync(K_PROFILE, JSON.stringify(prof)).catch(() => {});
      return "ok";
    } catch (e) {
      // The API client ends the session itself when the refresh token is refused.
      if (!tokenStore.hasSession() || isRefusal(e)) return "refused";
      return "offline";
    }
  }

  async function retryProfile(): Promise<void> {
    if (!profileMissing.current || profileBusy.current) return;
    if (profileTimer.current) clearTimeout(profileTimer.current);
    profileTimer.current = null;
    profileBusy.current = true;
    const r = await rebuildProfile();
    profileBusy.current = false;
    if (!profileMissing.current) return; // signed out or signed in again meanwhile
    if (r === "ok") {
      stopProfileRebuild();
    } else if (r === "refused") {
      stopProfileRebuild();
      // When the client already ended the session, its sign-out is under way.
      if (tokenStore.hasSession()) void doSignOut();
    } else {
      const ms = PROFILE_RETRY_MS[Math.min(profileTries.current, PROFILE_RETRY_MS.length - 1)];
      profileTries.current++;
      profileTimer.current = setTimeout(() => void retryProfile(), ms);
    }
  }

  async function doSignOut(): Promise<void> {
    // Same as stopProfileRebuild(), written out so this function only touches refs and setters.
    profileMissing.current = false;
    profileTries.current = 0;
    if (profileTimer.current) clearTimeout(profileTimer.current);
    profileTimer.current = null;
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
      let access: string | null;
      let refresh: string | null;
      try {
        ({ access, refresh } = await readTokens());
      } catch {
        // The store cannot be read at all. Nothing is deleted: the tokens may be readable at the next start.
        setStatus("anon");
        return;
      }
      if (!access || !refresh) {
        setStatus("anon");
        return;
      }
      tokenStore.set({ accessToken: access, refreshToken: refresh });
      const saved = await readProfile();
      if (saved) {
        setProfile(saved);
        setStatus("authed");
        void refreshOrg();
        return;
      }
      // Tokens saved but the profile is lost or corrupt: rebuild it instead of signing out.
      const r = await rebuildProfile();
      if (r === "refused") {
        // Ended by the API client (its sign-out is under way), or the account was refused.
        if (tokenStore.hasSession()) {
          tokenStore.clear();
          setStatus("anon");
        }
        return;
      }
      if (r === "offline") {
        // No answer from the server (no network at start). The tokens are what make a session:
        // stay signed in with what is known and fetch the profile as soon as the server answers.
        // Until then name, role and organization are empty and the screens show their own
        // "could not load" states. (Until 2026-11-17 this showed the login screen.)
        profileMissing.current = true;
        profileTimer.current = setTimeout(() => void retryProfile(), PROFILE_RETRY_MS[0]);
        profileTries.current = 1;
      }
      setStatus("authed");
    })();
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") void retryProfile();
    });
    return () => {
      appSub.remove();
      if (profileTimer.current) clearTimeout(profileTimer.current);
    };
    // Runs once at start; the helpers it calls only use refs, setters and the token store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user: profile?.user ?? null,
      org: profile?.org ?? null,
      async signIn(email, password) {
        const res = await loginRequest(email.trim(), password);
        stopProfileRebuild();
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
