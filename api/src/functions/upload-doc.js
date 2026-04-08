import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../upload-doc.js'

app.http('upload-doc', {
  methods: ['POST', 'OPTIONS'],
  route: 'upload-doc',
  handler: adaptHandler(handler),
})
