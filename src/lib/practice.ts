import data from '../data/practice-lessons.json'
import type { TestResult } from '../types'

export const practiceLessons = data
export type PracticeLesson = typeof data[number]
export type PracticeTrack = 'python' | 'web'
export const practiceTracks = [
  { id: 'python' as const, title: 'Почта острова', language: 'Python', description: 'От первой команды до программы, которая сортирует посылки и считает стоимость доставки.', result: 'Работающий диспетчер отправлений', skills: ['Условия', 'Циклы', 'Функции', 'Отладка'] },
  { id: 'web' as const, title: 'Сайт почтовой станции', language: 'HTML + CSS', description: 'Создай страницу, настрой раскладку и оживи открытку. Результат виден после каждого изменения.', result: 'Своя страница в файле HTML', skills: ['Структура', 'Селекторы', 'Flexbox', 'Grid', 'Анимация'] },
]
export const practiceKinds: Record<string, string> = { order: 'Собери программу', debug: 'Найди и исправь', code: 'Напиши сам', project: 'Итоговый проект' }

export function webDraft(raw: string | undefined, lesson: PracticeLesson) {
  if (raw) { try { const value = JSON.parse(raw); if (typeof value.html === 'string' && typeof value.css === 'string') return { html: value.html as string, css: value.css as string } } catch { /* Older or damaged drafts use the lesson starter. */ } }
  return { html: lesson.html, css: lesson.css }
}

const previewBase = `*{box-sizing:border-box}body{margin:0;padding:26px 18px;background:#dce7de;color:#24463e;font:16px/1.6 system-ui,sans-serif}main{max-width:480px;margin:auto}h1{font-size:26px;line-height:1.2;margin:12px 0}p{margin:12px 0}.postcard{background:#fff9e9;padding:14px;border-radius:16px;border:1px solid #b9c7b5;box-shadow:0 6px 0 #b4c4b3}.stamp{font-size:10px;letter-spacing:2px}.mailboxes{margin:22px 0}.mailboxes>span{display:block;min-width:0;min-height:42px;padding:8px 6px;background:#bfd0b4;border:1px solid #91aa82;text-align:center;border-radius:7px;font-size:13px}button{border:0;border-radius:7px;background:#315c4e;color:#f9efd8;padding:12px 16px;font:600 14px system-ui;cursor:pointer}ul{padding-left:22px}button:focus-visible{outline:3px solid #a96725;outline-offset:3px}`

export function previewDocument(html: string, css: string, motion = true) {
  const template = document.createElement('template')
  template.innerHTML = html
  const allowed = new Set(['MAIN', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'BUTTON', 'STRONG', 'EM', 'BR', 'CODE'])
  for (const el of [...template.content.querySelectorAll('*')]) {
    if (!allowed.has(el.tagName)) { el.remove(); continue }
    for (const attr of [...el.attributes]) if (!['class', 'id', 'type', 'aria-label'].includes(attr.name)) el.removeAttribute(attr.name)
  }
  // No scripts, navigable links, external assets or top-level navigation in the preview.
  // The sandbox grants only same-origin access so our checker can inspect computed styles.
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css.replace(/@import[^;]*(;|$)/gi, ''))
  const style = [...sheet.cssRules].filter(rule => rule.type === CSSRule.STYLE_RULE).map(rule => {
    const r = rule as CSSStyleRule
    const selector = r.selectorText.includes(':hover') ? `${r.selectorText},${r.selectorText.replaceAll(':hover', '.preview-hover')}` : r.selectorText
    return `${selector}{${r.style.cssText}}`
  }).join('\n').replaceAll('<', '\\3c ')
  const reduce = '* ,*::before,*::after{transition:none!important;animation:none!important}'
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Открытка Тихой бухты</title><style>${previewBase}</style><style>${style}</style><style>${motion ? `@media(prefers-reduced-motion:reduce){${reduce}}` : reduce}</style></head><body>${template.innerHTML}</body></html>`
}

export const webCriteria: Record<string, string> = {
  heading: 'Один главный заголовок: Почта острова', description: 'Описание оформлено абзацем', routes: 'Три адреса в настоящем списке', windows: 'Три окна: Маяк, Сад, Причал', button: 'Кнопка «Отправить открытку»',
  paper: 'Тёплый фон открытки', ink: 'Контрастный цвет текста', padding: 'Внутренние отступы 24px', flex: 'Включён Flexbox', spread: 'Окна распределены по ширине', grid: 'Включён Grid', 'equal-columns': 'Три равных столбца', gap: 'Промежутки 12px', transition: 'Переход transform за 200ms', lift: 'При наведении открытка поднимается на 4px',
}

export function checkWeb(doc: Document, criteria: string[]): TestResult[] {
  const win = doc.defaultView!
  const card = doc.querySelector<HTMLElement>('main.postcard')
  const boxes = doc.querySelector<HTMLElement>('.mailboxes')
  const style = card ? win.getComputedStyle(card) : null
  const layout = boxes ? win.getComputedStyle(boxes) : null
  const children = boxes ? [...boxes.children].map(e => e.getBoundingClientRect()) : []
  const names = (selector: string) => [...doc.querySelectorAll(selector)].map(e => e.textContent?.trim()).join('|')
  let lift = false
  if (card) {
    const oldTransition = card.style.transition
    const hovered = card.classList.contains('preview-hover')
    card.style.setProperty('transition', 'none', 'important'); card.classList.add('preview-hover')
    try { const m = new DOMMatrix(win.getComputedStyle(card).transform); lift = Math.abs(m.m42 + 4) < .1 && Math.abs(m.m41) < .1 } catch { /* invalid transform */ }
    card.classList.toggle('preview-hover', hovered); card.style.transition = oldTransition
  }
  const authorRules = doc.styleSheets[1] ? [...doc.styleSheets[1].cssRules] as CSSStyleRule[] : []
  const transition = authorRules.some(r => r.selectorText === '.postcard' && r.style.transitionProperty.split(',').some(p => ['transform', 'all'].includes(p.trim())) && r.style.transitionDuration.split(',').some(t => Math.abs(parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000) - 200) < .1))
  const sameRow = children.length === 3 && children.every(r => r.width > 0 && Math.abs(r.top - children[0].top) < 2)
  const values: Record<string, boolean> = {
    heading: doc.querySelectorAll('main h1').length === 1 && names('main h1') === 'Почта острова',
    description: [...doc.querySelectorAll('main p')].some(e => e.textContent?.trim() === 'Доставляем добрые новости.'),
    routes: names('main ul.routes > li') === 'Маяк|Сад|Причал', windows: names('.mailboxes > span') === 'Маяк|Сад|Причал',
    button: [...doc.querySelectorAll('main button')].some(e => e.getAttribute('type') === 'button' && e.textContent?.trim() === 'Отправить открытку'),
    paper: style?.backgroundColor === 'rgb(244, 232, 201)', ink: style?.color === 'rgb(35, 72, 63)',
    padding: Boolean(style && [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].every(v => v === '24px')),
    flex: ['flex', 'inline-flex'].includes(layout?.display ?? ''), grid: ['grid', 'inline-grid'].includes(layout?.display ?? ''),
    spread: Boolean(sameRow && boxes && Math.abs(children[0].left - boxes.getBoundingClientRect().left) < 2 && Math.abs(children[2].right - boxes.getBoundingClientRect().right) < 2 && Math.abs((children[1].left - children[0].right) - (children[2].left - children[1].right)) < 2),
    'equal-columns': sameRow && children.every(r => Math.abs(r.width - children[0].width) < 2),
    gap: layout?.rowGap === '12px' && layout?.columnGap === '12px', transition, lift,
  }
  const visible = Boolean(card && card.getBoundingClientRect().width > 0 && card.getBoundingClientRect().height > 0 && style?.visibility === 'visible' && style?.opacity !== '0' && win.getComputedStyle(doc.body).visibility === 'visible' && win.getComputedStyle(doc.body).opacity !== '0')
  return criteria.map(key => ({ label: webCriteria[key], passed: visible && (values[key] ?? false) }))
}
