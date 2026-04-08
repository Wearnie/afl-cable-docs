import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../document-map.js'

app.http('document-map', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  route: 'document-map',
  handler: adaptHandler(handler),
})
