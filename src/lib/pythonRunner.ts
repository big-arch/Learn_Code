import type { PythonCheck } from '../data/pythonCourse'
export interface PythonVariable { name: string; type: string; value: string }
export interface PythonStep { line: number; event: 'step' | 'exception'; scope: string; variables: PythonVariable[]; output: string }
export interface PythonResult {
  trace: PythonStep[]; traceTruncated: boolean
  output: string; error: string; tests: { label: string; passed: boolean }[]
  variables: PythonVariable[]
}
export class PythonRunner {
  private worker: Worker | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private reject: ((reason: Error) => void) | null = null
  stop(message = 'Выполнение остановлено. Код сохранён, можно исправить и запустить снова.') {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.worker?.terminate(); this.worker = null
    this.reject?.(new Error(message)); this.reject = null
  }
  run(code: string, checks: PythonCheck[], stdin: string, onStatus: (s: string) => void): Promise<PythonResult> {
    this.stop()
    if (code.length > 20000) return Promise.reject(new Error('Лимит: 20 000 символов кода.'))
    const worker = new Worker(new URL('../workers/python.worker.ts', import.meta.url), { type: 'module' })
    this.worker = worker
    return new Promise((resolve, reject) => {
      this.reject = reject
      this.timer = setTimeout(() => this.stop('Python не загрузился за 60 секунд. Обнови страницу и повтори запуск.'), 60000)
      worker.onmessage = (event) => {
        const message = event.data
        if (message.type === 'loading') onStatus('Запускаем локальную среду Python…')
        if (message.type === 'running') {
          onStatus('Выполняем Python…')
          if (this.timer) clearTimeout(this.timer)
          this.timer = setTimeout(() => this.stop('Лимит выполнения: 6 секунд. Проверь условие цикла или уменьши объём работы.'), 6000)
        }
        if (message.type === 'result' || message.type === 'failed') {
          if (this.timer) clearTimeout(this.timer)
          this.timer = null; this.reject = null
          worker.terminate(); this.worker = null
          if (message.type === 'result') resolve(message.result)
          else reject(new Error(message.error))
        }
      }
      worker.onerror = () => this.stop('Среда Python завершилась с ошибкой. Попробуй ещё раз.')
      worker.postMessage({ code, checks, stdin })
    })
  }
}
