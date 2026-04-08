// Adapter: translates Azure Functions v4 (request, context) into Vercel-compatible (req, res)
// so existing API handlers work unchanged on Azure Static Web Apps managed functions.

export function adaptHandler(handler) {
  return async (request) => {
    // Build Vercel-compatible req
    const url = new URL(request.url)
    const query = Object.fromEntries(url.searchParams)
    let body = null
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      try { body = await request.json() } catch { body = null }
    }
    const headers = {}
    request.headers.forEach((value, key) => { headers[key] = value })

    const req = { method: request.method, headers, query, body }

    // Build Vercel-compatible res that collects the response
    const responseHeaders = {}
    let statusCode = 200
    let responseBody = null

    const res = {
      setHeader(k, v) { responseHeaders[k] = v },
      status(code) { statusCode = code; return res },
      json(data) { responseBody = data; return res },
      end() { return res },
    }

    await handler(req, res)

    return { status: statusCode, headers: responseHeaders, jsonBody: responseBody }
  }
}
