import { mkdir, writeFile, rename, readFile, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
const manifest = JSON.parse(await readFile(new URL('./python-runtime.json', import.meta.url), 'utf8'))
const root = resolve('public/python', manifest.version)
await mkdir(root, { recursive: true })
const hash = data => createHash('sha256').update(data).digest('hex')
for (const [file, expected] of Object.entries(manifest.files)) {
  const target = resolve(root, file)
  try { if (hash(await readFile(target)) === expected) { console.log('Python: verified ' + file); continue } } catch {}
  if (file === 'LICENSE') {
    await copyFile(new URL('../docs/licenses/Pyodide-LICENSE.txt', import.meta.url), target)
    continue
  }
  console.log('Python: downloading ' + file)
  const response = await fetch('https://cdn.jsdelivr.net/pyodide/v' + manifest.version + '/full/' + file, { signal: AbortSignal.timeout(120000) })
  if (!response.ok) throw new Error(file + ': HTTP ' + response.status)
  const data = new Uint8Array(await response.arrayBuffer())
  if (hash(data) !== expected) throw new Error(file + ': checksum mismatch; refusing unverified runtime')
  await writeFile(target + '.part', data)
  await rename(target + '.part', target)
}
console.log('Python ' + manifest.version + ' ready: local runtime, verified SHA-256.')
