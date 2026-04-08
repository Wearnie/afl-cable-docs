import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../dj-overrides.js'

app.http('dj-overrides', {
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  route: 'dj-overrides',
  handler: adaptHandler(handler),
})
