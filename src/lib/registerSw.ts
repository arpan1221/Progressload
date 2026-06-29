// Registers the hand-rolled service worker. Safe no-op when unsupported
// (SSR, older browsers, or environments without the Service Worker API).
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal; the app still works online.
    });
  });
}
