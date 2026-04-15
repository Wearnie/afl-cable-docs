// Bootstrap the first admin user on a fresh deployment.
// ------------------------------------------------------
//
// Run this ONCE after standing up a new environment. It creates a single admin
// account in data/users.json with mustChangePassword=true so the user is forced
// to set a real password on first login. After that, manage users via the /users
// page in the app — this script is for the chicken-and-egg bootstrap case only.
//
// Usage:
//   AZURE_STORAGE_CONNECTION_STRING="..." \
//     node scripts/seed-first-admin.cjs \
//       --email admin@your-org.example.com \
//       --name "First Admin" \
//       --password-from-stdin
//
// Passing --password-from-stdin reads the password from stdin (so it doesn't
// land in shell history). Alternatively pass --password <plaintext> (not
// recommended outside automation).
//
// Will refuse to overwrite an existing user unless --force is given.
//
// Dependencies are resolved from api/node_modules (where @azure/storage-blob
// and bcryptjs are already installed for the Functions runtime).

const { BlobServiceClient } = require('../api/node_modules/@azure/storage-blob')
const bcrypt = require('../api/node_modules/bcryptjs')
const readline = require('readline')

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'afl-cable-docs'
const BLOB_PATH = 'data/users.json'
const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING

// --- Arg parsing -----------------------------------------------------------

function parseArgs(argv) {
  const args = { email: '', name: '', password: '', fromStdin: false, force: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') args.email = argv[++i]
    else if (a === '--name') args.name = argv[++i]
    else if (a === '--password') args.password = argv[++i]
    else if (a === '--password-from-stdin') args.fromStdin = true
    else if (a === '--force') args.force = true
    else if (a === '-h' || a === '--help') {
      printUsage()
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      printUsage()
      process.exit(1)
    }
  }
  return args
}

function printUsage() {
  console.log(`Usage: node scripts/seed-first-admin.cjs [options]

Required:
  --email <address>         Email for the admin account
  --name  <display name>    Display name

Password (exactly one):
  --password-from-stdin     Read password from stdin (recommended)
  --password <plaintext>    Set password directly (avoid in shell)

Optional:
  --force                   Overwrite an existing entry with this email

Environment:
  AZURE_STORAGE_CONNECTION_STRING   Required. From Bicep output.
  AZURE_STORAGE_CONTAINER           Optional. Default: afl-cable-docs`)
}

async function readPasswordFromStdin() {
  process.stdout.write('Password (input hidden): ')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  // Mute stdout echo while the password is being typed
  const originalWrite = process.stdout.write.bind(process.stdout)
  process.stdout.write = (chunk, enc, cb) => {
    if (typeof chunk === 'string' && (chunk === '\n' || chunk === '\r\n')) {
      originalWrite(chunk, enc, cb)
    }
    return true
  }
  const password = await new Promise((resolve) => rl.question('', resolve))
  process.stdout.write = originalWrite
  rl.close()
  process.stdout.write('\n')
  return password
}

// --- Main ------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv)

  if (!connStr) {
    console.error('error: AZURE_STORAGE_CONNECTION_STRING is required')
    process.exit(1)
  }

  if (!args.email || !args.name) {
    console.error('error: --email and --name are required')
    printUsage()
    process.exit(1)
  }

  if (!args.email.includes('@')) {
    console.error('error: --email does not look like an email address')
    process.exit(1)
  }

  let password = args.password
  if (args.fromStdin) {
    password = await readPasswordFromStdin()
  }
  if (!password || password.length < 8) {
    console.error('error: password must be at least 8 characters')
    process.exit(1)
  }

  const blobService = BlobServiceClient.fromConnectionString(connStr)
  const container = blobService.getContainerClient(CONTAINER_NAME)
  const blob = container.getBlockBlobClient(BLOB_PATH)

  // Load existing users if any
  let users = {}
  try {
    const response = await blob.download(0)
    const chunks = []
    for await (const chunk of response.readableStreamBody) chunks.push(chunk)
    users = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  } catch (err) {
    if (err.statusCode !== 404) throw err
  }

  const key = args.email.toLowerCase()
  if (users[key] && !args.force) {
    console.error(`error: user ${key} already exists. Pass --force to overwrite.`)
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  users[key] = {
    email: key,
    name: args.name,
    role: 'admin',
    passwordHash: hash,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  }

  await blob.upload(
    JSON.stringify(users, null, 2),
    Buffer.byteLength(JSON.stringify(users, null, 2)),
    { blobHTTPHeaders: { blobContentType: 'application/json' } }
  )

  console.log(`\n✓ Seeded admin: ${key}`)
  console.log('  The user will be prompted to change their password on first login.')
}

main().catch((err) => {
  console.error('\nerror:', err.message || err)
  process.exit(1)
})
