// Azure Blob Storage: CRUD for document-map.json
// GET    /api/document-map          → returns all entries
// POST   /api/document-map          → add entries
// PUT    /api/document-map          → atomic edit (remove + add)
// DELETE /api/document-map          → remove entries

import { requireAdmin } from './lib/auth.js'
import { readJSON, writeJSON } from './lib/blob-storage.js'

const BLOB_PATH = 'data/document-map.json'

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

function cleanEntry(e) {
  const entry = { pattern: e.pattern, type: e.type, name: e.name, path: e.path }
  if (e.exclude) entry.exclude = e.exclude
  return entry
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const entries = await readJSON(BLOB_PATH, [])
      return res.json({ entries, count: entries.length })
    }

    try { requireAdmin(req) } catch (err) {
      return res.status(err.status || 500).json({ error: err.message })
    }

    if (req.method === 'POST') {
      const { entries: newEntries } = req.body
      if (!Array.isArray(newEntries) || newEntries.length === 0) {
        return res.status(400).json({ error: 'Required: entries array with at least one entry' })
      }

      for (const entry of newEntries) {
        const err = validateEntry(entry)
        if (err) return res.status(400).json({ error: `Invalid entry (${entry.pattern}): ${err}` })
      }

      const existing = await readJSON(BLOB_PATH, [])

      const updated = [...existing]
      for (const newEntry of newEntries) {
        const entry = cleanEntry(newEntry)
        const idx = updated.findIndex(e => e.pattern === newEntry.pattern && e.type === newEntry.type)
        if (idx >= 0) updated[idx] = entry
        else updated.push(entry)
      }

      await writeJSON(BLOB_PATH, updated)

      return res.json({
        success: true,
        added: newEntries.length,
        total: updated.length,
        message: `${newEntries.length} mapping(s) saved.`,
      })
    }

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

      const existing = await readJSON(BLOB_PATH, [])

      const removeItems = remove || []
      let updated
      if (removeItems.length > 0 && typeof removeItems[0] === 'object') {
        const removeSet = new Set(removeItems.map(r => `${r.pattern}::${r.type}`))
        updated = existing.filter(e => !removeSet.has(`${e.pattern}::${e.type}`))
      } else {
        const removeSet = new Set(removeItems)
        updated = existing.filter(e => !removeSet.has(e.pattern))
      }

      if (add) {
        for (const newEntry of add) {
          const entry = { pattern: newEntry.pattern, type: newEntry.type, name: newEntry.name, path: newEntry.path }
          if (newEntry.exclude) entry.exclude = newEntry.exclude
          const idx = updated.findIndex(e => e.pattern === newEntry.pattern && e.type === newEntry.type)
          if (idx >= 0) updated[idx] = entry
          else updated.push(entry)
        }
      }

      await writeJSON(BLOB_PATH, updated)

      return res.json({
        success: true,
        removed: removeItems.length,
        added: (add || []).length,
        total: updated.length,
        message: `Mapping(s) updated.`,
      })
    }

    if (req.method === 'DELETE') {
      const { patterns, entries: deleteEntries } = req.body

      if (!deleteEntries && (!Array.isArray(patterns) || patterns.length === 0)) {
        return res.status(400).json({ error: 'Required: entries [{pattern, type}] or patterns [string]' })
      }

      const existing = await readJSON(BLOB_PATH, [])
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

      await writeJSON(BLOB_PATH, updated)

      return res.json({
        success: true,
        removed,
        total: updated.length,
        message: `${removed} mapping(s) removed.`,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Document map API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
