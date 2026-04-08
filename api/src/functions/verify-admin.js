import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../verify-admin.js'

app.http('verify-admin', {
  methods: ['GET', 'OPTIONS'],
  route: 'verify-admin',
  handler: adaptHandler(handler),
})
