/* VisuaLearn as an app: registers the service worker on every page so the whole site works offline,
   and keeps the manifest link in place so any page can be installed. */
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* still works online */ }));
  }
})();
