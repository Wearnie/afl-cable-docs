// Vercel Serverless Function: CRUD for document-map.json
// GET    /api/document-map          → returns all entries
// POST   /api/document-map          → add entries { entries: [{ pattern, type, name, path }] }
// DELETE /api/document-map          → remove entries { patterns: ["K3M**********"] }

import { requireAdmin } from './lib/auth.js'

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'public/data/document-map.json'

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not configured')

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body}`)
  }
  return res.json()
}

async function readDocumentMap() {
  const file = await githubRequest(`contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`)
  const content = Buffer.from(file.content, 'base64').toString('utf-8')
  return { entries: JSON.parse(content), sha: file.sha }
}

async function writeDocumentMap(entries, sha, message) {
  const content = Buffer.from(JSON.stringify(entries, null, 2) + '\n').toString('base64')
  await githubRequest(`contents/${FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content,
      sha,
      branch: GITHUB_BRANCH,
    }),
  })
}

function validateEntry(entry) {
  if (!entry.pattern || entry.pattern.length < 1) return 'Pattern is required'
  if (entry.exclude) {
    const excludes = Array.isArray(entry.exclude) ? entry.exclude : [entry.exclude]
    for (const ex of excludes) {
      if (typeof ex !== 'string' || ex.length < 1) return 'Each exclude pattern must be a non-empty string'
    }
  }
  if (!entry.type) return 'Type is required'
  if (!entry.name) return 'Name is required'
  if (!entry.path) return 'Path is required'
  if (!entry.path.startsWith('/')) return 'Path must start with /'
  return null
}

// Build a clean entry object, preserving all known fields
function cleanEntry(e) {
  const entry = { pattern: e.pattern, type: e.type, name: e.name, path: e.path }
  if (e.exclude) entry.exclude = e.exclude
  return entry
}

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'https://afl-cable-docs.vercel.app'
  const isWriteMethod = ['POST', 'PUT', 'DELETE'].includes(req.method)
  res.setHeader('Access-Control-Allow-Origin', isWriteMethod ? ALLOWED_ORIGIN : '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    return res.status(200).end()
  }

  try {
    // GET — public, no auth needed
    if (req.method === 'GET') {
      const { entries } = await readDocumentMap()
      return res.json({ entries, count: entries.length })
    }

    // Auth required for all write operations
    try { requireAdmin(req) } catch (err) {
      return res.status(err.status || 500).json({ error: err.message })
    }

    if (req.method === 'POST') {
      const { entries: newEntries } = req.body
      if (!Array.isArray(newEntries) || newEntries.length === 0) {
        return res.status(400).json({ error: 'Required: entries array with at least one entry' })
      }

      // Validate all entries
      for (const entry of newEntries) {
        const err = validateEntry(entry)
        if (err) return res.status(400).json({ error: `Invalid entry (${entry.pattern}): ${err}` })
      }

      const { entries: existing, sha } = await readDocumentMap()

      // Add new entries (replace if same pattern+type exists)
      const updated = [...existing]
      for (const newEntry of newEntries) {
        const entry = cleanEntry(newEntry)
        const idx = updated.findIndex(e => e.pattern === newEntry.pattern && e.type === newEntry.type)
        if (idx >= 0) {
          updated[idx] = entry
        } else {
          updated.push(entry)
        }
      }

      await writeDocumentMap(updated, sha, `Add ${newEntries.length} document mapping(s)`)

      return res.json({
        success: true,
        added: newEntries.length,
        total: updated.length,
        message: `${newEntries.length} mapping(s) saved. Site will redeploy in ~60 seconds.`,
      })
    }

    // PUT — atomic edit: remove old pattern(s) + add new pattern(s) in one commit
    if (req.method === 'PUT') {
      const { remove, add } = req.body
      if (!Array.isArray(remove) && !Array.isArray(add)) {
        return res.status(400).json({ error: 'Required: remove (patterns array) and/or add (entries array)' })
      }

      if (add) {
        for (const entry of add) {
          const err = validateEntry(entry)
          if (err) return res.status(400).json({ error: `Invalid entry (${entry.pattern}): ${err}` })
        }
      }

      const { entries: existing, sha } = await readDocumentMap()

      // Remove — supports both [{pattern, type}] objects and plain [string] patterns
      const removeItems = remove || []
      let updated
      if (removeItems.length > 0 && typeof removeItems[0] === 'object') {
        const removeSet = new Set(removeItems.map(r => `${r.pattern}::${r.type}`))
        updated = existing.filter(e => !removeSet.has(`${e.pattern}::${e.type}`))
      } else {
        const removeSet = new Set(removeItems)
        updated = existing.filter(e => !removeSet.has(e.pattern))
      }

      // Add
      if (add) {
        for (const newEntry of add) {
          const entry = { pattern: newEntry.pattern, type: newEntry.type, name: newEntry.name, path: newEntry.path }
          if (newEntry.exclude) entry.exclude = newEntry.exclude
          const idx = updated.findIndex(e => e.pattern === newEntry.pattern && e.type === newEntry.type)
          if (idx >= 0) {
            updated[idx] = entry
          } else {
            updated.push(entry)
          }
        }
      }

      const removedCount = existing.length - (updated.length - (add || []).length)
      await writeDocumentMap(updated, sha, `Edit document mapping(s): -${removeItems.length} +${(add || []).length}`)

      return res.json({
        success: true,
        removed: removeItems.length,
        added: (add || []).length,
        total: updated.length,
        message: `Mapping(s) updated. Site will redeploy in ~60 seconds.`,
      })
    }

    if (req.method === 'DELETE') {
      const { patterns, entries: deleteEntries } = req.body

      if (!deleteEntries && (!Array.isArray(patterns) || patterns.length === 0)) {
        return res.status(400).json({ error: 'Required: entries [{pattern, type}] or patterns [string]' })
      }

      const { entries: existing, sha } = await readDocumentMap()
      let updated
      if (deleteEntries && Array.isArray(deleteEntries)) {
        const deleteSet = new Set(deleteEntries.map(e => `${e.pattern}::${e.type}`))
        updated = existing.filter(e => !deleteSet.has(`${e.pattern}::${e.type}`))
      } else {
        const patternSet = new Set(patterns)
        updated = existing.filter(e => !patternSet.has(e.pattern))
      }
      const removed = existing.length - updated.length

      if (removed === 0) {
        return res.json({ success: true, removed: 0, message: 'No matching patterns found' })
      }

      await writeDocumentMap(updated, sha, `Remove ${removed} document mapping(s)`)

      return res.json({
        success: true,
        removed,
        total: updated.length,
        message: `${removed} mapping(s) removed. Site will redeploy in ~60 seconds.`,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Document map API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
