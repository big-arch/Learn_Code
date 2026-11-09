import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Package, Mail } from 'lucide-react'
import type { PythonResult, PythonVariable } from '../lib/pythonRunner'

function numbers(vars: PythonVariable[], name: string): number[] {
  try { const value = JSON.parse(vars.find(v => v.name === name)?.value ?? '[]'); return Array.isArray(value) && value.every(n => typeof n === 'number') ? value.slice(0, 16) : [] } catch { return [] }
}

export function ParcelTrace({ result, source, motion }: { result: PythonResult | null; source: string; motion: boolean }) {
  const [step, setStep] = useState(0), [playing, setPlaying] = useState(() => Boolean(result && !result.error && result.trace.length > 1 && motion && !matchMedia('(prefers-reduced-motion: reduce)').matches))
  const trace = result ? result.traceTruncated ? [...result.trace, { line: 0, variables: result.variables, output: result.output }] : result.trace : []
  const snapshot = trace[step], vars = snapshot?.variables ?? result?.variables ?? []
  const count = trace.length
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const pause = () => { if (document.hidden || media.matches) setPlaying(false) }
    document.addEventListener('visibilitychange', pause); media.addEventListener('change', pause)
    return () => { document.removeEventListener('visibilitychange', pause); media.removeEventListener('change', pause) }
  }, [])
  useEffect(() => {
    if (!playing || step >= count - 1) return
    const timer = setTimeout(() => { setStep(s => s + 1); if (step + 1 >= count - 1) setPlaying(false) }, 850)
    return () => clearTimeout(timer)
  }, [playing, step, count])
  const weights = numbers(vars, 'weights'), heavy = numbers(vars, 'heavy')
  const shown = weights.length ? weights : [2, 7, 1, 6]
  return <section className="parcel-trace" aria-label="Почтовая лента выполнения" data-animate={motion ? 'yes' : 'no'}>
    <header><Mail size={20}/><div><strong>Почта Тихой бухты</strong><span>{snapshot ? `Шаг ${step + 1} из ${count}` : 'Станция ждёт твою программу'}</span></div></header>
    <div className="parcel-station"><div className="station-roof"/><div className="station-sign">ПРИЁМ · СОРТИРОВКА · ДОСТАВКА</div><div className="parcel-belt" aria-label="Веса посылок">{shown.map((n, i) => <span key={`${i}-${n}`} className={weights.length ? 'known' : ''}><Package size={26}/><b>{n}<small> кг</small></b></span>)}</div><div className="parcel-tray"><span>Отобрано для тележки</span><div>{heavy.length ? heavy.map((n, i) => <b key={`${i}-${n}`}><Package size={17}/>{n} кг</b>) : <small>{snapshot ? 'Список пока пуст' : 'Здесь появится список heavy'}</small>}</div></div></div>
    {snapshot ? <>
      <div className="parcel-source"><small>{snapshot.line ? `Строка ${snapshot.line}` : 'Итог всей программы'}</small><code>{snapshot.line ? source.split('\n')[snapshot.line - 1] : 'Программа завершена'}</code></div>
      <div className="parcel-controls"><button type="button" aria-label="Назад по выполнению" disabled={!step} onClick={() => { setPlaying(false); setStep(s => s - 1) }}><ChevronLeft size={17}/></button><button type="button" onClick={() => { if (step >= count - 1) setStep(0); setPlaying(!playing && count > 1) }}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Пауза' : 'По шагам'}</button><button type="button" aria-label="Вперёд по выполнению" disabled={step >= count - 1} onClick={() => { setPlaying(false); setStep(s => s + 1) }}><ChevronRight size={17}/></button><button type="button" onClick={() => { setPlaying(false); setStep(count - 1) }}>Итог</button></div>
      <dl className="parcel-values">{vars.map(v => <div key={v.name}><dt>{v.name}<small>{v.type}</small></dt><dd>{v.value}</dd></div>)}</dl>
      {snapshot.output && <pre className="parcel-output">{snapshot.output}</pre>}
      {result?.traceTruncated && <p className="practice-note">Записаны первые 120 шагов. «Итог» показывает финальные значения.</p>}
    </> : <p className="practice-note">После запуска здесь появятся настоящие значения Python. В заданиях с циклами ты увидишь, как собирается список посылок.</p>}
  </section>
}
