// Worker exclusivo da migração Featured do portal Energia Limpa.
// Publicar como n8n-pel-featured-proxy; não substituir n8n-pel-proxy.
const ORIGIN = 'https://energialimpa.live';

function route(path, method) {
  if (path === '/energia/health' && method === 'GET') return 'health';
  if (/^\/energia\/wp-json\/wp\/v2\/posts(?:\/\d+)?\/?$/.test(path) && method === 'GET') {
    return 'wordpress';
  }
  if (/^\/energia\/wp-json\/wp\/v2\/media\/\d+\/?$/.test(path) &&
      (method === 'GET' || method === 'DELETE')) {
    return 'wordpress';
  }
  if (/^\/energia\/wp-json\/m360\/v1\/external-featured-media(?:\/assign)?\/?$/.test(path) &&
      method === 'POST') {
    return 'wordpress';
  }
  if (path.startsWith('/energia/wp-content/uploads/') &&
      (method === 'GET' || method === 'HEAD')) {
    return 'wordpress';
  }
  return null;
}

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-PEL-Featured-Proxy': 'cloudflare-worker',
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const kind = route(incoming.pathname, request.method);
    if (kind === 'health') {
      return json({status: 'ok', proxy: 'n8n-pel-featured-proxy', target: 'energialimpa.live'}, 200);
    }
    if (!kind) {
      return json({status: 'route_not_allowed', path: incoming.pathname, method: request.method}, 404);
    }

    const target = new URL(ORIGIN + incoming.pathname.replace(/^\/energia/, ''));
    target.search = incoming.search;
    const headers = new Headers(request.headers);
    for (const name of ['host', 'cf-connecting-ip', 'x-forwarded-for', 'x-real-ip']) {
      headers.delete(name);
    }
    headers.set('User-Agent', 'EnergiaLimpa-Featured-Migration/1.0');

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    try {
      const response = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        // Nunca reenviar automaticamente um corpo de uso único após redirect.
        redirect: hasBody ? 'manual' : 'follow'
      });

      if (hasBody && response.status >= 300 && response.status < 400) {
        return json({
          status: 'origin_redirect',
          proxy: 'n8n-pel-featured-proxy',
          target: target.toString(),
          origin_status: response.status,
          location: response.headers.get('Location')
        }, 502, {'X-Origin-Status': String(response.status)});
      }

      if (response.status >= 400) {
        return json({
          status: 'origin_error',
          proxy: 'n8n-pel-featured-proxy',
          target: target.toString(),
          origin_status: response.status,
          origin_status_text: response.statusText,
          origin_body: await response.text()
        }, response.status, {'X-Origin-Status': String(response.status)});
      }

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-PEL-Featured-Proxy', 'cloudflare-worker');
      responseHeaders.set('X-Origin-Status', String(response.status));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      return json({
        status: 'proxy_error',
        proxy: 'n8n-pel-featured-proxy',
        message: error.message
      }, 502);
    }
  }
};
