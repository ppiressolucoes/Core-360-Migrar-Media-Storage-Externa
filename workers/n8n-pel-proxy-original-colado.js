export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    let targetUrl;
    // =====================================================
    // HEALTH CHECK
    // =====================================================
    if (incomingUrl.pathname === "/energia/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          proxy: "n8n-pel-proxy",
          target: "energialimpa.live"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    // =====================================================
    // FEEDS - principal + todas as categorias
    // =====================================================
    if (
      incomingUrl.pathname === "/energia/feed" ||
      (
        incomingUrl.pathname.startsWith("/energia/category/") &&
        incomingUrl.pathname.endsWith("/feed/")
      )
    ) {
      if (request.method !== "GET") {
        return new Response("Método não permitido.", {
          status: 405,
          headers: {
            "Allow": "GET"
          }
        });
      }
      const wordpressPath = incomingUrl.pathname.replace(
        /^\/energia/,
        ""
      );
      targetUrl = new URL(
        "https://energialimpa.live" + wordpressPath
      );
      targetUrl.search = incomingUrl.search;
    }
    // =====================================================
    // WORDPRESS REST API
    // =====================================================
    else if (
      incomingUrl.pathname === "/energia/wp-json" ||
      incomingUrl.pathname.startsWith("/energia/wp-json/")
    ) {
      const restPath = incomingUrl.pathname.replace(
        "/energia/wp-json",
        ""
      );
      targetUrl = new URL(
        "https://energialimpa.live/wp-json" + restPath
      );
      targetUrl.search = incomingUrl.search;
    }
    // =====================================================
    // WORDPRESS REST API via ?rest_route=
    // Aceita /energia e /energia/*
    // =====================================================
    else if (
      (
        incomingUrl.pathname === "/energia" ||
        incomingUrl.pathname === "/energia/"
      ) &&
      incomingUrl.searchParams.has("rest_route")
    ) {
      targetUrl = new URL(
        "https://energialimpa.live/"
      );
      targetUrl.search = incomingUrl.search;
    }
    // =====================================================
    // WORDPRESS UPLOADS - ARQUIVOS DE MÍDIA
    //
    // NOVA ROTA:
    // /energia/wp-content/uploads/*
    //
    // Uso:
    // download/leitura dos arquivos existentes no WordPress.
    //
    // Segurança:
    // somente GET e HEAD.
    // =====================================================
    else if (
      incomingUrl.pathname.startsWith(
        "/energia/wp-content/uploads/"
      )
    ) {
      if (
        request.method !== "GET" &&
        request.method !== "HEAD"
      ) {
        return new Response(
          "Método não permitido.",
          {
            status: 405,
            headers: {
              "Allow": "GET, HEAD"
            }
          }
        );
      }
      const uploadsPath = incomingUrl.pathname.replace(
        /^\/energia/,
        ""
      );
      targetUrl = new URL(
        "https://energialimpa.live" + uploadsPath
      );
      targetUrl.search = incomingUrl.search;
    }
    // =====================================================
    // BLOQUEIA OUTRAS ROTAS
    // =====================================================
    else {
      return new Response(
        JSON.stringify({
          status: "route_not_allowed",
          path: incomingUrl.pathname
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    // =====================================================
    // HEADERS
    // =====================================================
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.set(
      "User-Agent",
      "EnergiaLimpa-N8N-Proxy/1.0"
    );
    // =====================================================
    // CHAMADA AO ORIGIN
    // =====================================================
    try {
      const init = {
        method: request.method,
        headers,
        redirect: "follow"
      };
      if (
        request.method !== "GET" &&
        request.method !== "HEAD"
      ) {
        init.body = request.body;
      }
      const response = await fetch(
        targetUrl.toString(),
        init
      );
      // ===================================================
      // ERROS DO ORIGIN - DIAGNÓSTICO
      // ===================================================
      if (response.status >= 400) {
        const originBody = await response.text();
        return new Response(
          JSON.stringify({
            status: "origin_error",
            proxy: "n8n-pel-proxy",
            target: targetUrl.toString(),
            origin_status: response.status,
            origin_status_text: response.statusText,
            origin_body: originBody
          }),
          {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "X-N8N-Proxy": "cloudflare-worker",
              "X-Target-Site": "energialimpa.live",
              "X-Origin-Status": String(response.status)
            }
          }
        );
      }
      // ===================================================
      // RESPOSTA NORMAL
      // ===================================================
      const responseHeaders =
        new Headers(response.headers);
      responseHeaders.set(
        "X-N8N-Proxy",
        "cloudflare-worker"
      );
      responseHeaders.set(
        "X-Target-Site",
        "energialimpa.live"
      );
      responseHeaders.set(
        "X-Origin-Status",
        String(response.status)
      );
      return new Response(
        response.body,
        {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        }
      );
    } catch (error) {
      // ===================================================
      // ERRO DO PRÓPRIO WORKER / FETCH
      // ===================================================
      return new Response(
        JSON.stringify({
          status: "proxy_error",
          proxy: "n8n-pel-proxy",
          message: error.message
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "X-N8N-Proxy": "cloudflare-worker"
          }
        }
      );
    }
  }
};
