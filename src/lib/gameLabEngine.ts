import type { CSSProperties } from 'react'
import type { Direction, LanguageId } from '../types'

export interface CommandBlock { direction: Direction; count: number }
export function blocksToCode(blocks: CommandBlock[], language: LanguageId) {
  const call = language === 'csharp' ? 'Hero.Move' : language === 'go' ? 'hero.Move' : 'hero.move'
  return blocks.map(b => {
    const statement = `${call}("${b.direction}")${language === 'javascript' || language === 'csharp' ? ';' : ''}`
    if (b.count === 1) return statement
    if (language === 'python') return `for i in range(${b.count}):\n    ${statement}`
    const head = language === 'go' ? `for i := 0; i < ${b.count}; i++ {` : `for (${language === 'csharp' ? 'int' : 'let'} i = 0; i < ${b.count}; i++) {`
    return `${head}\n    ${statement}\n}`
  }).join('\n')
}

// Only lesson-specific declarations reach an element style; never inject a stylesheet.
export function labStyle(source: string, mode: 'flex' | 'grid'): { style: CSSProperties; error: string } {
  const style: Record<string, string> = {}
  const allowed: Record<string, string> = mode === 'flex'
    ? { 'justify-content': 'justifyContent', 'align-items': 'alignItems', 'flex-direction': 'flexDirection' }
    : { 'grid-column': 'gridColumn', 'grid-row': 'gridRow' }
  const values: Record<string, string[]> = {
    'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
    'align-items': ['flex-start', 'flex-end', 'center'], 'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  }
  for (const declaration of source.replace(/\/\*[\s\S]*?\*\//g, '').split(';').filter(s => s.trim())) {
    const [property, value, extra] = declaration.split(':').map(s => s.trim())
    if (!allowed[property] || !value || extra !== undefined) return { style, error: 'Здесь доступны только: ' + Object.keys(allowed).join(', ') + '. Пиши свойства без фигурных скобок.' }
    if (mode === 'flex' ? !values[property].includes(value) : !/^[1-5](?:\s*\/\s*(?:[1-5]|span\s+[1-4]))?$/.test(value)) return { style, error: 'Проверь значение свойства ' + property + '. Образец есть в подсказке.' }
    style[allowed[property]] = value
  }
  return { style, error: '' }
}

export function matchingRects(actual: Element[], expected: Element[]) {
  if (!actual.length || actual.length !== expected.length) return false
  return actual.every((el, i) => {
    const a = el.getBoundingClientRect(), b = expected[i].getBoundingClientRect()
    return a.width > 0 && a.height > 0 && ['x', 'y', 'width', 'height'].every(key => Math.abs(a[key as 'x'] - b[key as 'x']) < 3)
  })
}
