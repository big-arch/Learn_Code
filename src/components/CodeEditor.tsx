import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Play, RotateCcw } from 'lucide-react'

interface CodeEditorProps {
  value: string
  fileName: string
  onChange: (value: string) => void
  onRun: () => void
  onReset: () => void
  activeLine?: number
}

export function CodeEditor({ value, fileName, onChange, onRun, onReset, activeLine }: CodeEditorProps) {
  const linesRef = useRef<HTMLDivElement>(null)
  const lines = value.split('\n')

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      const input = event.currentTarget
      const start = input.selectionStart
      const end = input.selectionEnd
      const next = `${value.slice(0, start)}    ${value.slice(end)}`
      onChange(next)
      requestAnimationFrame(() => {
        input.selectionStart = input.selectionEnd = start + 4
      })
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      onRun()
    }
  }

  return (
    <div className="code-editor">
      <div className="editor-toolbar">
        <span className="editor-file"><i />{fileName}</span>
        <button className="icon-button subtle" type="button" onClick={onReset} aria-label="Сбросить код">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="editor-body">
        <div className="line-numbers" ref={linesRef} aria-hidden="true">
          {lines.map((_, index) => <span className={activeLine === index + 1 ? 'active-line' : ''} key={index}>{String(index + 1).padStart(2, '0')}</span>)}
        </div>
        <textarea
          id="mission-code"
          aria-label="Код решения"
          aria-describedby="editor-shortcut"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={(event) => {
            if (linesRef.current) linesRef.current.scrollTop = event.currentTarget.scrollTop
          }}
          spellCheck={false}
          maxLength={20000}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <div className="editor-footer">
        <span id="editor-shortcut"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> для запуска</span>
        <button className="button primary run-button" type="button" onClick={onRun}>
          <Play size={17} fill="currentColor" aria-hidden="true" />
          Запустить код
        </button>
      </div>
    </div>
  )
}
