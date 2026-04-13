import { app } from '@azure/functions'
import { adaptHandler } from '../../lib/azure-adapter.js'
import handler from '../../product-codes.js'

app.http('product-codes', {
  methods: ['GET', 'OPTIONS'],
  route: 'product-codes',
  handler: adaptHandler(handler),
})
