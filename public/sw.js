// This project does NOT use a service worker.
//
// A previous app served on this same localhost port may have registered one,
// which then hijacks the origin and requests chunks that don't exist here
// (the flood of 404s for framer-motion / firebase / theme-provider / etc.).
//
// This self-unregistering worker neutralizes that stale registration: when the
// browser update-checks /sw.js it installs this, which clears all caches,
// unregisters itself, and reloads open tabs — healing the origin automatically.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // ignore — best effort cache purge
      }
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
