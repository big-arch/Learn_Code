import { ArrowRight, Code2, Eye, Rocket } from 'lucide-react'
import type { LanguageId } from '../types'
export function BeginnerPath({ onStart }: { onStart: (id: LanguageId) => void }) {
  return <section className="beginner-path" aria-labelledby="beginner-title">
    <div className="beginner-intro"><span className="section-kicker">ПЕРВЫЕ 5 МИНУТ</span><h2 id="beginner-title">С нуля — до «я понял».</h2><p>Ничего устанавливать не нужно. Начнём с одной команды.</p><button type="button" onClick={() => onStart('python')}>Я никогда не писал код <ArrowRight size={17} /></button></div>
    <div className="learning-steps">
      <article><span>01</span><Eye size={23} /><h3>Разберись</h3><p>Узнай, что означает каждая часть команды.</p></article>
      <article><span>02</span><Code2 size={23} /><h3>Попробуй</h3><p>Напиши строку и запусти её. Ошибаться можно.</p></article>
      <article><span>03</span><Rocket size={23} /><h3>Увидь результат</h3><p>Робот выполнит твой код. Пройди маршрут по шагам.</p></article>
    </div>
  </section>
}
