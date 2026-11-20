// Measure the caret, including wrapped lines, without scrolling the whole editor.
export function revealEditorCaret(input: HTMLTextAreaElement) {
  if (document.activeElement !== input) return
  const style = getComputedStyle(input), mirror = document.createElement('div')
  for (const key of ['font', 'letterSpacing', 'lineHeight', 'padding', 'border', 'boxSizing', 'whiteSpace', 'overflowWrap', 'wordBreak', 'tabSize'] as const) mirror.style[key] = style[key]
  Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', pointerEvents: 'none', top: '0', left: '0', width: `${input.getBoundingClientRect().width}px`, height: 'auto' })
  mirror.textContent = input.value.slice(0, input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd)
  const caret = document.createElement('span')
  caret.textContent = '\u200b'
  mirror.append(caret)
  document.body.append(mirror)
  const offset = caret.getBoundingClientRect().top - mirror.getBoundingClientRect().top
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.8
  mirror.remove()
  const caretTop = () => input.getBoundingClientRect().top + offset - input.scrollTop
  const delta = (top: number, bottom: number) => {
    const y = caretTop()
    return y < top ? y - top : y + lineHeight > bottom ? y + lineHeight - bottom : 0
  }
  // Dialogs own their scroll; the page must stay in place behind them.
  for (let parent = input.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (!/auto|scroll/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue
    const bounds = parent.getBoundingClientRect()
    parent.scrollBy({ top: delta(bounds.top + parent.clientTop + 20, bounds.top + parent.clientTop + parent.clientHeight - 24), behavior: 'instant' })
  }
  if (input.closest('dialog')) return
  const viewport = window.visualViewport
  let top = (viewport?.offsetTop ?? 0) + 20, bottom = top + (viewport?.height ?? innerHeight) - 44
  const header = document.querySelector('.topbar')?.getBoundingClientRect()
  const navigation = document.querySelector('.mobile-nav')?.getBoundingClientRect()
  if (header?.height) top = Math.max(top, header.bottom + 20)
  if (navigation?.height) bottom = Math.min(bottom, navigation.top - 20)
  window.scrollBy({ top: delta(top, bottom), behavior: 'instant' })
}
