"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, Session } from "@/lib/types";
import { loadAppData, saveAppData } from "@/lib/store";
import { hydrate, upsertSession, flushPending } from "@/lib/sync";
import {
  hasSupabaseEnv,
  onAuthChange,
  signOut as supaSignOut,
} from "@/lib/supabase";
import { registerServiceWorker } from "@/lib/registerSw";
import { todayLocal, nowIso } from "@/lib/dates";
import AuthGate from "@/components/AuthGate";
import Home from "@/components/Home";
import SessionScreen from "@/components/SessionScreen";
import ExportImport from "@/components/ExportImport";

type Route = { name: "home" } | { name: "session"; id: string };

export default function App() {
  const [data, setData] = useState<AppData>({ sessions: [] });
  const [online, setOnline] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasEnv = hasSupabaseEnv();

  // Keep a ref to the latest data for use inside event listeners.
  const dataRef = useRef(data);
  dataRef.current = data;

  // Replace/insert a session by id, persist locally, and best-effort upsert.
  const persistSession = useCallback((session: Session) => {
    const stamped: Session = {
      ...session,
      updatedAt: nowIso(),
      pendingSync: true,
    };
    setData((prev) => {
      const sessions = prev.sessions.some((s) => s.id === stamped.id)
        ? prev.sessions.map((s) => (s.id === stamped.id ? stamped : s))
        : [...prev.sessions, stamped];
      const next = { sessions };
      saveAppData(next);
      return next;
    });
    // Background sync — never blocks the UI.
    void upsertSession(stamped).then((ok) => {
      if (!ok) return;
      setData((prev) => {
        const sessions = prev.sessions.map((s) =>
          s.id === stamped.id && s.updatedAt === stamped.updatedAt
            ? { ...s, pendingSync: false }
            : s
        );
        const next = { sessions };
        saveAppData(next);
        return next;
      });
    });
  }, []);

  // Replace whole AppData (import / hydrate).
  const replaceData = useCallback((next: AppData) => {
    setData(next);
    saveAppData(next);
  }, []);

  const doFlush = useCallback(() => {
    if (!dataRef.current.sessions.some((s) => s.pendingSync)) return;
    void flushPending(dataRef.current).then((next) => setData(next));
  }, []);

  // Mount: render local immediately, then hydrate + register SW + subscribe.
  useEffect(() => {
    const local = loadAppData();
    setData(local);
    registerServiceWorker();

    let cancelled = false;
    void hydrate(local).then(async (res) => {
      if (cancelled) return;
      setData(res.data);
      setOnline(res.online);
      setUserId(res.userId);
      // Flush any pending sessions (e.g. freshly seeded, or logged while
      // offline) as soon as we're online — app open is a sync point.
      if (res.online && res.data.sessions.some((s) => s.pendingSync)) {
        const next = await flushPending(res.data);
        if (!cancelled) setData(next);
      }
    });

    const unsub = onAuthChange((uid) => {
      setUserId(uid);
      if (uid) {
        setOfflineMode(false);
        void hydrate(dataRef.current).then(async (res) => {
          setData(res.data);
          setOnline(res.online);
          setUserId(res.userId);
          if (res.online && res.data.sessions.some((s) => s.pendingSync)) {
            const next = await flushPending(res.data);
            setData(next);
          }
        });
      }
    });

    const onOnline = () => {
      setOnline(true);
      doFlush();
    };
    const onFocus = () => doFlush();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", () => setOnline(false));
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [doFlush]);

  const startWorkout = (templateId: string) => {
    const session: Session = {
      id: crypto.randomUUID(),
      date: todayLocal(),
      templateId,
      exercises: [],
      updatedAt: nowIso(),
      pendingSync: true,
    };
    persistSession(session);
    setRoute({ name: "session", id: session.id });
  };

  const handleSignOut = async () => {
    await supaSignOut();
    setUserId(null);
    setSettingsOpen(false);
  };

  const pending = data.sessions.some((s) => s.pendingSync);
  const activeSession =
    route.name === "session"
      ? data.sessions.find((s) => s.id === route.id)
      : undefined;

  return (
    <AuthGate
      hasEnv={hasEnv}
      userId={userId}
      offlineMode={offlineMode}
      onContinueOffline={() => setOfflineMode(true)}
    >
      {route.name === "session" && activeSession ? (
        <SessionScreen
          session={activeSession}
          allSessions={data.sessions}
          onUpdateSession={persistSession}
          onFinish={() => setRoute({ name: "home" })}
        />
      ) : (
        <Home
          sessions={data.sessions}
          online={online}
          pending={pending}
          onStart={startWorkout}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {settingsOpen ? (
        <ExportImport
          data={data}
          onImport={(d) => {
            replaceData(d);
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
          onSignOut={handleSignOut}
          signedIn={Boolean(userId)}
        />
      ) : null}
    </AuthGate>
  );
}
