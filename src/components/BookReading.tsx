import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react'
import type { PythonLesson } from '../data/pythonCourse'

export function BookReading({ reading }: { reading: PythonLesson['reading'] }) {
  const excerpt = reading.russian
  return <details className="book-source book-reading">
    <summary>
      <BookOpen size={22} aria-hidden="true" />
      <span><strong>Читать на русском</strong><span>{reading.source}</span></span>
      <ChevronDown size={20} className="book-reading-chevron" aria-hidden="true" />
    </summary>
    <article lang="ru" className="book-reading-content" aria-label={excerpt.title}>
      <p className="book-reading-kind">{excerpt.kind}</p>
      <h3>{excerpt.title}</h3>
      {excerpt.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {excerpt.code && <pre><code>{excerpt.code}</code></pre>}
      <footer>
        <p>{excerpt.attribution} Текст фрагмента: <a href={excerpt.licenseUrl} target="_blank" rel="noreferrer">{excerpt.license}</a>.</p>
        <a className="book-reading-original" href={reading.url} target="_blank" rel="noreferrer">{excerpt.linkLabel} <ExternalLink size={16} aria-hidden="true" /></a>
      </footer>
    </article>
  </details>
}
