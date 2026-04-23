// Adapter: translates Azure Functions v4 (request, context) into the Express-style
// (req, res) shape our handlers are written against.

export function adaptHandler(handler) {
  return async (request) => {
    // Build Express-style req
    const url = new URL(request.url)
    const query = Object.fromEntries(url.searchParams)
    let body = null
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      try { body = await request.json() } catch { body = null }
    }
    const headers = {}
    request.headers.forEach((value, key) => { headers[key] = value })

    const req = { method: request.method, headers, query, body }

    // Build Express-style res that collects the response
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
