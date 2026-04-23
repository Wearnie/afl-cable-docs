import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../config.js'

app.http('config', {
  methods: ['GET', 'PUT', 'OPTIONS'],
  route: 'config',
  handler: adaptHandler(handler),
})
