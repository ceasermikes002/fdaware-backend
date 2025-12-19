import 'dotenv/config'

async function main() {
  const rawBase = process.env.API_BASE_URL || ''
  const token = process.env.API_TOKEN || ''
  const testEmail = process.env.TEST_EMAIL || ''

  if (!rawBase) throw new Error('API_BASE_URL is required')

  const base = rawBase.replace(/\/+$/, '')
  const baseNoApi = base.replace(/\/?api\/?$/, '')
  const api = baseNoApi + '/api'

  const f: any = (global as any).fetch

  console.log('Health: email transporter')
  let res = await f(api + '/config/email-health', { headers: { Authorization: `Bearer ${token}` } })
  console.log('email-health', res.status, await res.text())

  if (!testEmail) {
    console.log('Skipping invite test: set TEST_EMAIL')
    return
  }

  console.log('Create workspace')
  res = await f(api + '/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'e2e-' + Date.now() }),
  })
  const wsText = await res.text()
  console.log('create-workspace', res.status, wsText)
  if (res.status >= 300) return
  const ws = JSON.parse(wsText)

  console.log('Invite member')
  res = await f(api + `/workspaces/${ws.id}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: testEmail, role: 'viewer' }),
  })
  console.log('invite', res.status, await res.text())
}

main().catch(err => { console.error(err); process.exit(1) })
