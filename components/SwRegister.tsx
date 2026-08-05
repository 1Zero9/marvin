"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const shouldRegister = process.env.NODE_ENV === "production"
      || process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === "1";
    if (shouldRegister) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations
        .filter((registration) => new URL(registration.scope).origin === window.location.origin)
        .map((registration) => registration.unregister())))
      .catch(() => {});
  }, []);

  return null;
}
