import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../upload-cert.js'

app.http('upload-cert', {
  methods: ['POST', 'OPTIONS'],
  route: 'upload-cert',
  handler: adaptHandler(handler),
})
