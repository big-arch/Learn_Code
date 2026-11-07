import type { ProgressState } from '../types'
const KEY = 'code-arena-profile-key'
function profileKey() {
  let token = localStorage.getItem(KEY)
  if (!token) { token = crypto.randomUUID(); localStorage.setItem(KEY, token) }
  return token
}
export async function fetchProgress(): Promise<ProgressState | null> {
  const res = await fetch('/api/progress', { headers: { 'X-Profile-Key': profileKey() }, signal: AbortSignal.timeout(2500) })
  if (!res.ok) throw new Error('Хранилище недоступно')
  return (await res.json()).progress
}
let writes = Promise.resolve()
export function syncProgress(progress: ProgressState) {
  // Serialize writes so rapid edits/reset cannot be overwritten by an older request.
  const operation = writes.catch(() => {}).then(async () => {
    const res = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Profile-Key': profileKey() }, body: JSON.stringify(progress), signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error('Сохранение недоступно')
  })
  writes = operation
  return operation
}
