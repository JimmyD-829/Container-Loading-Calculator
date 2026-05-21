import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

addEventListener('fetch', (event) => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  try {
    return await getAssetFromKV(event, {
      mapRequestToAsset: (req) => {
        let url = new URL(req.url);
        if (url.pathname.endsWith('/')) {
          url.pathname += 'index.html';
        }
        return mapRequestToAsset(new Request(url.toString(), req));
      },
    });
  } catch (e) {
    let pathname = new URL(event.request.url).pathname;
    return new Response(`Error accessing ${pathname}: ${e.message}`, {
      status: 500,
    });
  }
}
