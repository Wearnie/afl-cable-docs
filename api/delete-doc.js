// Vercel Serverless Function: Delete a document (PDF) from the repo
// DELETE /api/delete-doc
//
// Accepts JSON body:
//   - path: document path relative to /docs/ (e.g. "/tds/Some Cable.pdf")
//   - removePatterns: boolean (default true) — also remove all document-map entries pointing to this path
//
// Deletes the file from GitHub and optionally cleans up document-map.json

import { requireAdmin } from './lib/auth.js'

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const DOC_MAP_PATH = 'public/data/document-map.json'

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

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'https://afl-cable-docs.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try { requireAdmin(req) } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }

  try {
    const { path: docPath, removePatterns = true } = req.body

    if (!docPath || typeof docPath !== 'string') {
      return res.status(400).json({ error: 'Required: path (e.g. "/tds/Some Cable.pdf")' })
    }

    // Resolve to repo file path
    const cleanPath = docPath.startsWith('/') ? docPath.slice(1) : docPath
    const filePath = `public/docs/${cleanPath}`

    // 1. Get the file SHA (needed for deletion)
    let fileSha
    try {
      const file = await githubRequest(`contents/${filePath}?ref=${GITHUB_BRANCH}`)
      fileSha = file.sha
    } catch (err) {
      if (err.message.includes('404')) {
        return res.status(404).json({ error: `File not found: ${docPath}` })
      }
      throw err
    }

    // 2. Delete the file from GitHub
    await githubRequest(`contents/${filePath}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `Delete document: ${cleanPath}`,
        sha: fileSha,
        branch: GITHUB_BRANCH,
      }),
    })

    // 3. Remove matching entries from document-map.json
    let removedPatterns = 0
    if (removePatterns) {
      try {
        const mapFile = await githubRequest(`contents/${DOC_MAP_PATH}?ref=${GITHUB_BRANCH}`)
        const entries = JSON.parse(Buffer.from(mapFile.content, 'base64').toString('utf-8'))
        const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`
        const filtered = entries.filter(e => e.path !== normalizedPath)
        removedPatterns = entries.length - filtered.length

        if (removedPatterns > 0) {
          await githubRequest(`contents/${DOC_MAP_PATH}`, {
            method: 'PUT',
            body: JSON.stringify({
              message: `Remove ${removedPatterns} mapping(s) for deleted doc: ${cleanPath}`,
              content: Buffer.from(JSON.stringify(filtered, null, 2) + '\n').toString('base64'),
              sha: mapFile.sha,
              branch: GITHUB_BRANCH,
            }),
          })
        }
      } catch (err) {
        console.error('Warning: could not clean up document-map:', err.message)
      }
    }

    return res.json({
      success: true,
      deleted: docPath,
      removedPatterns,
      message: `Document deleted${removedPatterns > 0 ? ` and ${removedPatterns} pattern mapping(s) removed` : ''}. Site will redeploy in ~60 seconds.`,
    })
  } catch (err) {
    console.error('Delete doc error:', err)
    return res.status(500).json({ error: err.message })
  }
}
