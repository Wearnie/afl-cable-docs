// Shared Azure Blob Storage helper for API endpoints
// Replaces the GitHub API read/write pattern with blob storage

import { BlobServiceClient } from '@azure/storage-blob'

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'afl-cable-docs'

let _containerClient = null

function getContainerClient() {
  if (_containerClient) return _containerClient
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured')
  const blobService = BlobServiceClient.fromConnectionString(connStr)
  _containerClient = blobService.getContainerClient(CONTAINER_NAME)
  return _containerClient
}

/**
 * Read a JSON file from blob storage.
 * Returns { data, etag } where etag can be passed to writeJSON for optimistic concurrency.
 * If the blob doesn't exist, returns { data: defaultValue, etag: null }.
 */
export async function readJSON(blobPath, defaultValue = {}) {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(blobPath)
  try {
    const response = await blob.download(0)
    const text = await streamToString(response.readableStreamBody)
    return { data: JSON.parse(text), etag: response.etag }
  } catch (err) {
    if (err.statusCode === 404) return { data: defaultValue, etag: null }
    throw err
  }
}

/**
 * Write a JSON file to blob storage.
 * Pass etag from readJSON for optimistic concurrency (409 on conflict).
 * Omit etag for unconditional write.
 */
export async function writeJSON(blobPath, data, etag) {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(blobPath)
  const content = JSON.stringify(data, null, 2)
  const options = {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  }
  if (etag) {
    options.conditions = { ifMatch: etag }
  }
  await blob.upload(content, content.length, options)
}

/**
 * Upload a binary file (e.g. PDF) to blob storage.
 * content should be a Buffer.
 */
export async function uploadBlob(blobPath, content, contentType = 'application/pdf') {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(blobPath)
  await blob.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
}

/**
 * Delete a blob. Returns true if deleted, false if it didn't exist.
 */
export async function deleteBlob(blobPath) {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(blobPath)
  try {
    await blob.delete()
    return true
  } catch (err) {
    if (err.statusCode === 404) return false
    throw err
  }
}

/**
 * Check if a blob exists.
 */
export async function blobExists(blobPath) {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(blobPath)
  return blob.exists()
}

/**
 * Get the public URL for a blob.
 */
export function getBlobUrl(blobPath) {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(blobPath)
  return blob.url
}

/**
 * Append an audit log entry. Fire-and-forget — errors are logged but not thrown.
 * Uses append blobs for efficient sequential writes.
 */
export async function appendAuditLog(entry) {
  try {
    const container = getContainerClient()
    const blob = container.getAppendBlobClient('data/audit-log.jsonl')
    try { await blob.createIfNotExists() } catch {}
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n'
    await blob.appendBlock(line, line.length)
  } catch (err) {
    console.error('Audit log write failed:', err.message)
  }
}

// Helper to read a stream into a string
async function streamToString(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}
