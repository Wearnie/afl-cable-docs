import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../delete-doc.js'

app.http('delete-doc', {
  methods: ['DELETE', 'OPTIONS'],
  route: 'delete-doc',
  handler: adaptHandler(handler),
})
