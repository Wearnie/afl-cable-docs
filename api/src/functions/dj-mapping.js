import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../dj-mapping.js'

app.http('dj-mapping', {
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  route: 'dj-mapping',
  handler: adaptHandler(handler),
})
