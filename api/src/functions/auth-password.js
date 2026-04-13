import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../auth/password.js'

app.http('auth-password', {
  methods: ['PUT', 'OPTIONS'],
  route: 'auth/password',
  handler: adaptHandler(handler),
})
