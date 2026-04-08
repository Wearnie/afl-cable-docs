import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../sync-mapping.js'

app.http('sync-mapping', {
  methods: ['GET', 'POST', 'OPTIONS'],
  route: 'sync-mapping',
  handler: adaptHandler(handler),
})
