const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('legalOfficeDesktop', {
    openSettings: () => ipcRenderer.send('open-settings'),
    getConfig: () => ipcRenderer.invoke('get-config'),
    setSource: (source) => ipcRenderer.invoke('set-source', source),
    reload: () => ipcRenderer.invoke('reload-app'),
    devtools: () => ipcRenderer.invoke('open-devtools'),
    localDbQuery: (req) => ipcRenderer.invoke('local-db-query', req),
});

const fetchInterceptorScript = `
(function() {
  if (window.__legalOfficeFetchInjected) return;
  window.__legalOfficeFetchInjected = true;

  const _origFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input && input.url) {
      url = input.url;
    }

    if (url && (url.includes('supabase.co') || url.includes('54321') || url.includes('3000'))) {
      const method = (init && init.method) || (typeof input === 'object' && input.method) || 'GET';
      const headers = {};
      if (init && init.headers) {
        if (typeof init.headers.forEach === 'function') {
          init.headers.forEach((v, k) => { headers[k] = v; });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([k, v]) => { headers[k] = v; });
        } else {
          Object.assign(headers, init.headers);
        }
      }
      let body = (init && init.body) || null;
      if (body && typeof body !== 'string') {
        try { body = JSON.stringify(body); } catch (e) {}
      }

      try {
        if (window.legalOfficeDesktop && window.legalOfficeDesktop.localDbQuery) {
          const res = await window.legalOfficeDesktop.localDbQuery({ url, method, headers, body });
          const responseHeaders = new Headers();
          responseHeaders.set('content-type', 'application/json');
          if (res && res.headers) {
            Object.keys(res.headers).forEach(k => {
              responseHeaders.set(k, res.headers[k]);
            });
          }
          const responseData = (res && res.data !== undefined) ? res.data : [];
          return new Response(typeof responseData === 'string' ? responseData : JSON.stringify(responseData), {
            status: (res && res.status) || 200,
            statusText: (res && res.statusText) || 'OK',
            headers: responseHeaders
          });
        }
      } catch (err) {
        console.error('Local DB Fetch Interceptor Error:', err);
      }
    }

    return _origFetch.apply(this, arguments);
  };
})();
`;

try {
  webFrame.executeJavaScript(fetchInterceptorScript);
} catch (e) {
  console.warn('Failed to inject fetchInterceptorScript in webFrame:', e);
}