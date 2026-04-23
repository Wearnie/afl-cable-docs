import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getClientPrincipal, resolveRole, principalToUser } from './client-principal.js'

function encodePrincipal(principal) {
  return Buffer.from(JSON.stringify(principal)).toString('base64')
}

describe('getClientPrincipal', () => {
  it('returns null when header is missing', () => {
    expect(getClientPrincipal({ headers: {} })).toBe(null)
  })

  it('returns null when req.headers is undefined', () => {
    expect(getClientPrincipal({})).toBe(null)
  })

  it('returns null for malformed base64', () => {
    expect(getClientPrincipal({ headers: { 'x-ms-client-principal': '!!!not-base64!!!' } })).toBe(null)
  })

  it('returns null for valid base64 but malformed JSON', () => {
    const bad = Buffer.from('not-json').toString('base64')
    expect(getClientPrincipal({ headers: { 'x-ms-client-principal': bad } })).toBe(null)
  })

  it('returns null when decoded value is not an object', () => {
    const notObj = Buffer.from('42').toString('base64')
    expect(getClientPrincipal({ headers: { 'x-ms-client-principal': notObj } })).toBe(null)
  })

  it('parses a valid principal', () => {
    const principal = {
      identityProvider: 'aad',
      userId: 'abc-123',
      userDetails: 'mithra@afl.com',
      userRoles: ['authenticated', 'admin'],
      claims: [{ typ: 'name', val: 'Mithra B' }],
    }
    const parsed = getClientPrincipal({
      headers: { 'x-ms-client-principal': encodePrincipal(principal) },
    })
    expect(parsed).toEqual(principal)
  })
})

describe('resolveRole', () => {
  const originalAdmin = process.env.AUTH_ADMIN_EMAILS
  const originalDispatch = process.env.AUTH_DISPATCH_EMAILS

  beforeEach(() => {
    delete process.env.AUTH_ADMIN_EMAILS
    delete process.env.AUTH_DISPATCH_EMAILS
  })
  afterEach(() => {
    if (originalAdmin !== undefined) process.env.AUTH_ADMIN_EMAILS = originalAdmin
    if (originalDispatch !== undefined) process.env.AUTH_DISPATCH_EMAILS = originalDispatch
  })

  it('returns null for null principal', () => {
    expect(resolveRole(null)).toBe(null)
  })

  it('returns null when principal has no roles and no email match', () => {
    expect(resolveRole({ userDetails: 'random@example.com', userRoles: [] })).toBe(null)
  })

  it('returns admin for AAD admin role', () => {
    expect(resolveRole({ userDetails: 'x@y.com', userRoles: ['authenticated', 'admin'] })).toBe('admin')
  })

  it('returns dispatch for AAD dispatch role', () => {
    expect(resolveRole({ userDetails: 'x@y.com', userRoles: ['authenticated', 'dispatch'] })).toBe('dispatch')
  })

  it('prefers admin over dispatch when both roles are present', () => {
    expect(resolveRole({ userDetails: 'x@y.com', userRoles: ['dispatch', 'admin'] })).toBe('admin')
  })

  it('admin email whitelist wins over missing AAD role', () => {
    process.env.AUTH_ADMIN_EMAILS = 'mithra@afl.com, jim@afl.com'
    expect(resolveRole({ userDetails: 'mithra@afl.com', userRoles: ['authenticated'] })).toBe('admin')
  })

  it('admin email whitelist wins over AAD dispatch role', () => {
    process.env.AUTH_ADMIN_EMAILS = 'mithra@afl.com'
    expect(resolveRole({ userDetails: 'mithra@afl.com', userRoles: ['dispatch'] })).toBe('admin')
  })

  it('dispatch email whitelist grants dispatch role', () => {
    process.env.AUTH_DISPATCH_EMAILS = 'dispatch1@afl.com,dispatch2@afl.com'
    expect(resolveRole({ userDetails: 'dispatch1@afl.com', userRoles: [] })).toBe('dispatch')
  })

  it('email matching is case-insensitive', () => {
    process.env.AUTH_ADMIN_EMAILS = 'Mithra@AFL.com'
    expect(resolveRole({ userDetails: 'mithra@afl.com', userRoles: [] })).toBe('admin')
    expect(resolveRole({ userDetails: 'MITHRA@AFL.COM', userRoles: [] })).toBe('admin')
  })

  it('empty env vars behave as no whitelist', () => {
    process.env.AUTH_ADMIN_EMAILS = ''
    process.env.AUTH_DISPATCH_EMAILS = '   '
    expect(resolveRole({ userDetails: 'x@y.com', userRoles: [] })).toBe(null)
  })

  it('handles missing userRoles gracefully', () => {
    expect(resolveRole({ userDetails: 'x@y.com' })).toBe(null)
  })
})

describe('principalToUser', () => {
  it('builds { email, role, name } from principal and role', () => {
    const principal = {
      userDetails: 'Mithra@AFL.com',
      userRoles: ['admin'],
      claims: [{ typ: 'name', val: 'Mithra B' }],
    }
    expect(principalToUser(principal, 'admin')).toEqual({
      email: 'mithra@afl.com',
      role: 'admin',
      name: 'Mithra B',
    })
  })

  it('falls back to userDetails when no name claim', () => {
    const principal = { userDetails: 'user@example.com', userRoles: [], claims: [] }
    expect(principalToUser(principal, 'dispatch')).toEqual({
      email: 'user@example.com',
      role: 'dispatch',
      name: 'user@example.com',
    })
  })

  it('uses preferred_username claim if name is absent', () => {
    const principal = {
      userDetails: 'user@example.com',
      claims: [{ typ: 'preferred_username', val: 'User E' }],
    }
    expect(principalToUser(principal, 'admin').name).toBe('User E')
  })
})
