import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../final-test-certs.js'

app.http('final-test-certs', {
  methods: ['GET', 'OPTIONS'],
  route: 'final-test-certs',
  handler: adaptHandler(handler),
})
