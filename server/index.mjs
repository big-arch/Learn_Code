import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const databasePath = process.env.DB_PATH || resolve(root, 'data/learning.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
const db = new DatabaseSync(databasePath)
db.exec(readFileSync(resolve(root, 'server/schema.sql'), 'utf8'))
db.exec('PRAGMA busy_timeout = 5000')
const get = db.prepare('SELECT state_json FROM learner_progress WHERE profile_hash = ?')
const save = db.prepare("INSERT INTO learner_progress(profile_hash,state_json) VALUES(?,?) ON CONFLICT(profile_hash) DO UPDATE SET state_json=excluded.state_json, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')")
const dist = resolve(root, 'dist')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.zip': 'application/zip', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }
const missionIds = ['python-first-contact','csharp-gate-protocol','go-cloud-runner','javascript-neon-route','html-interface-awakening','css-frog-signal','python-repeat','javascript-repeat','csharp-repeat','go-repeat','html-first-link','css-center']
const pythonCourse = JSON.parse(readFileSync(resolve(root, 'src/data/python-course.json'), 'utf8'))
missionIds.push(...pythonCourse.lessons.flatMap(l => [l.id, l.id + '-quiz']))
const islandQuests = JSON.parse(readFileSync(resolve(root, 'src/data/adventure-quests.json'), 'utf8'))
missionIds.push(...islandQuests.map(q => q.id))
const labLevels = JSON.parse(readFileSync(resolve(root, 'src/data/game-lab.json'), 'utf8'))
missionIds.push(...labLevels.map(l => l.id))
const mechanisms = JSON.parse(readFileSync(resolve(root, 'src/data/mechanism-missions.json'), 'utf8'))
missionIds.push(...mechanisms.map(l => l.id))
const record = (v, limit) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= missionIds.length && Object.entries(v).every(([k,s]) => missionIds.includes(k) && typeof s === 'string' && s.length <= limit)
export function validState(s) {
  return Boolean(s && typeof s === 'object' && s.version === 1 &&
    Number.isSafeInteger(s.xp) && s.xp >= 0 && s.xp <= 100000 &&
    Array.isArray(s.completed) && s.completed.length <= missionIds.length && new Set(s.completed).size === s.completed.length && s.completed.every(id => missionIds.includes(id)) &&
    record(s.drafts, 20000) && record(s.completedAt, 40) &&
    Array.isArray(s.activity) && s.activity.length === 7 && s.activity.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 10000) &&
    Number.isSafeInteger(s.streak) && s.streak >= 0 && s.streak <= 10000 &&
    (s.lastCompletionDate === null || typeof s.lastCompletionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastCompletionDate)) &&
    typeof s.sound === 'boolean' && typeof s.motion === 'boolean')
}
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname
    if (pathname === '/api/health' && req.method === 'GET') { db.prepare('SELECT 1').get(); return json(res, 200, { ok: true, storage: 'sqlite' }) }
    if (pathname.startsWith('/api/')) {
      if (pathname !== '/api/progress') return json(res, 404, { error: 'Not found' })
      const token = req.headers['x-profile-key']
      if (typeof token !== 'string' || !/^[a-f0-9-]{36}$/.test(token)) return json(res, 401, { error: 'Profile key required' })
      const hash = createHash('sha256').update(token).digest('hex')
      if (req.method === 'GET') { const row = get.get(hash); return json(res, 200, { progress: row ? JSON.parse(row.state_json) : null }) }
      if (req.method !== 'PUT') return json(res, 405, { error: 'Method not allowed' })
      if (!req.headers['content-type']?.startsWith('application/json')) { req.resume(); return json(res, 415, { error: 'JSON required' }) }
      const chunks = []; let size = 0
      for await (const chunk of req.iterator({ destroyOnReturn: false })) { size += chunk.length; if (size > 1500000) { res.setHeader('Connection', 'close'); req.resume(); return json(res, 413, { error: 'Body too large' }) } chunks.push(chunk) }
      let state
      try { state = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return json(res, 400, { error: 'Invalid JSON' }) }
      if (!validState(state)) return json(res, 400, { error: 'Invalid progress' })
      // Store only the documented fields, never arbitrary client properties.
      const { version, xp, completed, completedAt, drafts, activity, streak, lastCompletionDate, sound, motion } = state
      save.run(hash, JSON.stringify({ version, xp, completed, completedAt, drafts, activity, streak, lastCompletionDate, sound, motion }))
      return json(res, 200, { saved: true })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' })
    const path = resolve(dist, '.' + decodeURIComponent(pathname))
    if (path !== dist && !path.startsWith(dist + sep)) return json(res, 403, { error: 'Forbidden' })
    const target = existsSync(path) && statSync(path).isFile() ? path : extname(path) ? null : resolve(dist, 'index.html')
    if (!target || !existsSync(target)) return json(res, 404, { error: 'Build frontend with pnpm build first' })
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': (target.includes(sep + 'assets' + sep) || target.includes(sep + 'python' + sep)) ? 'public, max-age=31536000, immutable' : 'no-cache' })
    res.end(req.method === 'HEAD' ? undefined : readFileSync(target))
  } catch (error) { console.error('Request failed:', error.message); if (!res.headersSent) json(res, 500, { error: 'Storage temporarily unavailable' }); else res.end() }
})
server.listen(Number(process.env.PORT || 4174), process.env.HOST || '127.0.0.1', () => console.log('Code Arena: http://' + (process.env.HOST || '127.0.0.1') + ':' + (process.env.PORT || 4174)))
const close = () => server.close(() => { db.close(); process.exit(0) })
process.on('SIGTERM', close); process.on('SIGINT', close)
