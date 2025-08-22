export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // CORS preflight for API paths
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Telegram-User-Id',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // API routes to proxy to Fly backend
    const isApi = url.pathname.startsWith('/order')
               || url.pathname.startsWith('/reviews')
               || url.pathname.startsWith('/admin');

    if (isApi) {
      const outUrl = new URL(req.url);
      outUrl.hostname = 'carwash2o.fly.dev';
      outUrl.protocol = 'https:';

      const headers = new Headers(req.headers);
      headers.set('Host', 'carwash2o.fly.dev');

      const resp = await fetch(new Request(outUrl, {
        method: req.method,
        headers,
        body: ['GET','HEAD'].includes(req.method) ? undefined : req.body
      }));

      const outHeaders = new Headers(resp.headers);
      outHeaders.set('Access-Control-Allow-Origin', '*');
      outHeaders.set('Vary', 'Origin');
      return new Response(resp.body, { status: resp.status, headers: outHeaders });
    }

    // Serve static assets via Pages
    return env.ASSETS.fetch(req);
  }
}
