import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../auth/me.js'

app.http('auth-me', {
  methods: ['GET', 'OPTIONS'],
  route: 'auth/me',
  handler: adaptHandler(handler),
})
