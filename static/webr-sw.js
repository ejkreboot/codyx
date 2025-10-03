import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';

// WebR Service Worker
async function handleRequest(request) {
  return WebR.handleRequest(request);
}

self.addEventListener('fetch', event => {
  if (event.request.url.includes('webr')) {
    event.respondWith(handleRequest(event.request));
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'WEBR_INIT') {
    // Initialize WebR in service worker context
    self.webR = new WebR();
  }
});