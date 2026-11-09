/// <reference lib="webworker" />
import type { PythonCheck } from '../data/pythonCourse'
interface Runtime { globals: { set: (name: string, value: string) => void }; runPython: (code: string) => string }
const scope = self as unknown as DedicatedWorkerGlobalScope
const INDEX = new URL(import.meta.env.BASE_URL + 'python/314.0.7/', self.location.origin).href
let runtime: Runtime | null = null
import runner from './python-harness.py?raw'
scope.onmessage = async (event: MessageEvent<{ code: string; checks: PythonCheck[]; stdin: string }>) => {
  try {
    if (!runtime) {
      scope.postMessage({ type: 'loading' })
      const module = await import(/* @vite-ignore */ INDEX + 'pyodide.mjs')
      runtime = await module.loadPyodide({ indexURL: INDEX, stdin: () => null })
    }
    scope.postMessage({ type: 'running' })
    runtime!.globals.set('__arena_request', JSON.stringify(event.data))
    scope.postMessage({ type: 'result', result: JSON.parse(runtime!.runPython(runner)) })
  } catch (error) {
    scope.postMessage({ type: 'failed', error: 'Не удалось загрузить или запустить Python. Обнови страницу и повтори. Если ошибка сохраняется, сообщи владельцу сайта. ' + String(error).slice(0, 180) })
  }
}
