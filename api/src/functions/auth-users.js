import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../auth/users.js'

app.http('auth-users', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  route: 'auth/users',
  handler: adaptHandler(handler),
})
