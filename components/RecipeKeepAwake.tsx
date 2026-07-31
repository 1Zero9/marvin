"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./RecipeKeepAwake.module.css";

type WakeLockSentinelLike = EventTarget & {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export default function RecipeKeepAwake() {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const wantedRef = useRef(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    setActive(false);
    if (sentinel) await sentinel.release().catch(() => {});
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!wantedRef.current || document.visibilityState !== "visible") return;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) {
      wantedRef.current = false;
      setActive(false);
      setMessage("Keeping the screen awake is not supported by this browser.");
      return;
    }
    try {
      const sentinel = await wakeLock.request("screen");
      if (!wantedRef.current) {
        await sentinel.release().catch(() => {});
        return;
      }
      sentinelRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        sentinelRef.current = null;
        setActive(false);
      });
      setActive(true);
      setMessage(null);
    } catch {
      wantedRef.current = false;
      setActive(false);
      setMessage("Marvin couldn’t keep the screen awake. Check your browser or battery settings.");
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px) and (orientation: portrait)");
    const update = () => {
      setIsPortraitMobile(media.matches);
      if (!media.matches && wantedRef.current) {
        wantedRef.current = false;
        void releaseWakeLock();
      }
    };
    setSupported(Boolean((navigator as WakeLockNavigator).wakeLock));
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [releaseWakeLock]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden && wantedRef.current) void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wantedRef.current = false;
      void releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock]);

  async function toggle() {
    if (active || wantedRef.current) {
      wantedRef.current = false;
      await releaseWakeLock();
      setMessage(null);
      return;
    }
    wantedRef.current = true;
    await requestWakeLock();
  }

  if (!isPortraitMobile) return null;

  return (
    <aside className={styles.control} aria-live="polite">
      <div>
        <strong>Cooking mode</strong>
        <p>Keep this recipe on screen while you cook.</p>
      </div>
      {supported === true ? (
        <button type="button" className={`btn ${active ? "btn-primary" : "btn-secondary"}`} onClick={toggle} aria-pressed={active}>
          {active ? "Screen staying awake" : "Keep screen awake"}
        </button>
      ) : supported === false ? (
        <p className={styles.unsupported}>Your browser does not support screen wake lock.</p>
      ) : null}
      {message && <p className={styles.message}>{message}</p>}
    </aside>
  );
}
