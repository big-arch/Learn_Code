import { useRef } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { AssistedCodeInput } from './AssistedCodeInput'
import { languageFromFile } from '../lib/codeAssist'
import type { AssistMode } from '../lib/codeAssist'

interface CodeEditorProps {
  value: string
  fileName: string
  onChange: (value: string) => void
  onRun: () => void
  onReset: () => void
  activeLine?: number
  assistMode?: AssistMode
}

export function CodeEditor({ value, fileName, onChange, onRun, onReset, activeLine, assistMode='general' }: CodeEditorProps) {
  const linesRef = useRef<HTMLDivElement>(null)
  const lines = value.split('\n')

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
        <AssistedCodeInput
          key={fileName}
          language={languageFromFile(fileName)}
          mode={assistMode}
          value={value}
          onChange={onChange}
          onRun={onRun}
          onScroll={(event) => {
            if (linesRef.current) linesRef.current.scrollTop = event.currentTarget.scrollTop
          }}
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
