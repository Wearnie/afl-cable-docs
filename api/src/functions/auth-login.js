import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../auth/login.js'

app.http('auth-login', {
  methods: ['POST', 'OPTIONS'],
  route: 'auth/login',
  handler: adaptHandler(handler),
})
