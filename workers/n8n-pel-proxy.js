// Referência funcional reconstruída: não é a cópia literal do deployment
// original de 310 linhas. Para restaurá-lo, use o histórico do Cloudflare.
// O redirect automático de POST pode falhar se a origem exigir reenviar o corpo.
export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    let targetUrl;

    if (incomingUrl.pathname === '/energia/health') {
      return new Response(JSON.stringify({
        status: 'ok', proxy: 'n8n-pel-proxy', target: 'energialimpa.live'
      }), {status: 200, headers: {'Content-Type': 'application/json'}});
    }

    if (incomingUrl.pathname === '/energia/feed' ||
        (incomingUrl.pathname.startsWith('/energia/category/') &&
         incomingUrl.pathname.endsWith('/feed/'))) {
      if (request.method !== 'GET') {
        return new Response('Método não permitido.', {
          status: 405, headers: {Allow: 'GET'}
        });
      }
      targetUrl = new URL('https://energialimpa.live' +
        incomingUrl.pathname.replace(/^\/energia/, ''));
      targetUrl.search = incomingUrl.search;
    } else if (incomingUrl.pathname === '/energia/wp-json' ||
               incomingUrl.pathname.startsWith('/energia/wp-json/')) {
      targetUrl = new URL('https://energialimpa.live/wp-json' +
        incomingUrl.pathname.replace('/energia/wp-json', ''));
      targetUrl.search = incomingUrl.search;
    } else if ((incomingUrl.pathname === '/energia' ||
                incomingUrl.pathname === '/energia/') &&
               incomingUrl.searchParams.has('rest_route')) {
      targetUrl = new URL('https://energialimpa.live/');
      targetUrl.search = incomingUrl.search;
    } else if (incomingUrl.pathname.startsWith('/energia/wp-content/uploads/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Método não permitido.', {
          status: 405, headers: {Allow: 'GET, HEAD'}
        });
      }
      targetUrl = new URL('https://energialimpa.live' +
        incomingUrl.pathname.replace(/^\/energia/, ''));
      targetUrl.search = incomingUrl.search;
    } else {
      return new Response(JSON.stringify({
        status: 'route_not_allowed', path: incomingUrl.pathname
      }), {status: 404, headers: {'Content-Type': 'application/json'}});
    }

    const headers = new Headers(request.headers);
    for (const name of ['host', 'cf-connecting-ip', 'x-forwarded-for', 'x-real-ip']) {
      headers.delete(name);
    }
    headers.set('User-Agent', 'EnergiaLimpa-N8N-Proxy/1.0');

    try {
      const init = {
        method: request.method,
        headers,
        redirect: 'follow'
      };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body;
      }
      const response = await fetch(targetUrl.toString(), init);

      if (response.status >= 400) {
        const originBody = await response.text();
        return new Response(JSON.stringify({
          status: 'origin_error',
          proxy: 'n8n-pel-proxy',
          target: targetUrl.toString(),
          origin_status: response.status,
          origin_status_text: response.statusText,
          origin_body: originBody
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Proxy': 'cloudflare-worker',
            'X-Target-Site': 'energialimpa.live',
            'X-Origin-Status': String(response.status)
          }
        });
      }

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-N8N-Proxy', 'cloudflare-worker');
      responseHeaders.set('X-Target-Site', 'energialimpa.live');
      responseHeaders.set('X-Origin-Status', String(response.status));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'proxy_error',
        proxy: 'n8n-pel-proxy',
        message: error.message
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Proxy': 'cloudflare-worker'
        }
      });
    }
  }
};
