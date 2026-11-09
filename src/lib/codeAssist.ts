import type { LanguageId } from '../types'

export type AssistMode = 'general' | 'robot' | 'flex' | 'grid' | 'selector'
export interface Completion { label: string; detail: string; template: string }
const item = (label: string, detail: string, template = label): Completion => ({label, detail, template})
const python = [
  item('print', 'Вывести значение в консоль', 'print(«»)'),
  item('input', 'Прочитать строку с клавиатуры', 'input(«»)'),
  item('int', 'Преобразовать значение в целое число', 'int(«value»)'),
  item('float', 'Преобразовать в дробное число', 'float(«value»)'),
  item('str', 'Преобразовать значение в строку', 'str(«value»)'),
  item('len', 'Узнать длину строки или списка', 'len(«items»)'),
  item('range', 'Последовательность чисел для цикла', 'range(«3»)'),
  item('for', 'Повторить действия заданное число раз', 'for i in range(«3»):\n    pass'),
  item('if', 'Выполнить действие при условии', 'if «condition»:\n    pass'),
  item('elif', 'Проверить следующее условие', 'elif «condition»:\n    pass'),
  item('else', 'Действие, если условие не выполнено', 'else:\n    «pass»'),
  item('while', 'Повторять, пока условие истинно', 'while «condition»:\n    pass'),
  item('def', 'Объявить свою функцию', 'def «name»():\n    pass'),
  item('return', 'Вернуть результат из функции', 'return «value»'),
  item('True', 'Истина'), item('False', 'Ложь'), item('None', 'Отсутствие значения'),
  item('sum', 'Сумма чисел', 'sum(«items»)'), item('sorted', 'Создать отсортированный список', 'sorted(«items»)'),
  item('enumerate', 'Получить индекс и элемент', 'enumerate(«items»)'),
  item('list', 'Создать список', 'list(«»)'), item('dict', 'Создать словарь', 'dict(«»)'),
  item('import', 'Подключить модуль', 'import «math»'),
  item('try', 'Обработать возможную ошибку', 'try:\n    «pass»\nexcept ValueError:\n    pass'),
]
const flex = [item('justify-content', 'Расположение вдоль главной оси', 'justify-content: «center»;'), item('align-items', 'Выравнивание по поперечной оси', 'align-items: «center»;'), item('flex-direction', 'Направление главной оси', 'flex-direction: «row»;')]
const grid = [item('grid-column', 'Столбцы, которые займёт элемент', 'grid-column: «1 / 3»;'), item('grid-row', 'Строки, которые займёт элемент', 'grid-row: «1 / 2»;')]
const cssValues: Record<string, string[]> = {
  'justify-content':['center','flex-start','flex-end','space-between','space-around','space-evenly'],
  'align-items':['center','flex-start','flex-end','stretch'], 'flex-direction':['row','column','row-reverse','column-reverse'],
  display:['flex','grid','block','none'], 'grid-column':['1','2','3','4','1 / 3','2 / 4'], 'grid-row':['1','2','3','1 / 3'],
  color:['coral','white','black'], 'background-color':['coral','white','black'],
}
const catalogs: Record<LanguageId, Completion[]> = {
  python,
  javascript:[item('console.log', 'Вывести значение', 'console.log(«value»);'), item('let', 'Объявить переменную', 'let «name» = 0;'), item('const', 'Объявить неизменяемую привязку', 'const «name» = 0;'), item('for', 'Повторить действия', 'for (let i = 0; i < «3»; i++) {\n    \n}'), item('if', 'Проверить условие', 'if («condition») {\n    \n}'), item('function', 'Объявить функцию', 'function «name»() {\n    \n}'), item('return','Вернуть результат','return «value»;')],
  csharp:[item('Console.WriteLine','Вывести значение','Console.WriteLine(«value»);'), item('int','Целое число','int «number» = 0;'), item('string','Строка','string «text» = "";'), item('for','Повторить действия','for (int i = 0; i < «3»; i++) {\n    \n}'), item('if','Проверить условие','if («condition») {\n    \n}')],
  go:[item('fmt.Println','Вывести значение (нужен импорт fmt)','fmt.Println(«value»)'), item('for','Повторить действия','for i := 0; i < «3»; i++ {\n    \n}'), item('if','Проверить условие','if «condition» {\n    \n}'), item('func','Объявить функцию','func «name»() {\n    \n}')],
  html:[item('<a','Ссылка','<a href="«https://example.com»">Ссылка</a>'), item('<div','Контейнер','<div>«»</div>'), item('<p','Абзац','<p>«»</p>'), item('<h1','Заголовок','<h1>«Заголовок»</h1>'), item('<button','Кнопка','<button type="button">«Кнопка»</button>'), item('<img','Изображение','<img src="«image.png»" alt="Описание">')],
  css:[...flex,...grid,item('display','Режим раскладки','display: «flex»;'), item('color','Цвет текста','color: «coral»;'),item('background-color','Цвет фона','background-color: «coral»;'),item('gap','Расстояние между элементами','gap: «16px»;'),item('grid-template-columns','Шаблон столбцов','grid-template-columns: repeat(«3», 1fr);')],
}
export function languageFromFile(file: string): LanguageId {
  return ({py:'python',js:'javascript',cs:'csharp',go:'go',html:'html',css:'css'} as Record<string,LanguageId>)[file.split('.').pop() || ''] || 'python'
}

// A small lexical scan keeps suggestions and pairs out of comments and strings.
// It is intentionally not a compiler or a type checker.
export function lexicalContext(source: string, language: LanguageId) {
  let quote = '', comment = ''
  for(let i=0;i<source.length;i++) {
    if(comment) {
      if(comment==='line' && source[i]==='\n')comment=''
      else if(comment==='block' && source.startsWith('*/',i)){comment='';i++}
      else if(comment==='html' && source.startsWith('-->',i)){comment='';i+=2}
      continue
    }
    if(quote) {
      if(source[i]==='\\'){i++;continue}
      if(source.startsWith(quote,i)){i+=quote.length-1;quote=''}
      continue
    }
    if(language==='python' && source[i]==='#'){comment='line';continue}
    if(language!=='python' && language!=='html' && source.startsWith('//',i)){comment='line';i++;continue}
    if(language!=='python' && source.startsWith('/*',i)){comment='block';i++;continue}
    if(language==='html' && source.startsWith('<!--',i)){comment='html';i+=3;continue}
    if(language==='python' && (source.startsWith('"""',i)||source.startsWith("'''",i))){quote=source.slice(i,i+3);i+=2;continue}
    if(source[i]==='"'||source[i]==="'"||((language==='javascript'||language==='go')&&source[i]==='`'))quote=source[i]
  }
  return {quote,comment}
}

export function getCompletions(value: string, cursor: number, language: LanguageId, mode: AssistMode = 'general', manual = false) {
  const before=value.slice(0,cursor), context=lexicalContext(before,language)
  const empty={from:cursor,to:cursor,items:[] as Completion[]}
  if(context.quote||context.comment)return empty
  const prefix=before.match(language==='html'?/<\/?[\w-]*$/:/[A-Za-z_$][\w.$-]*$|[.#][\w-]*$/)?.[0] || ''
  if(!manual&&!prefix)return empty
  let choices=catalogs[language]
  if(mode==='flex')choices=flex
  if(mode==='grid')choices=grid
  if(mode==='selector')choices=[item('.plant','Все растения'),item('.mint','Растения класса mint'),item('.sunflower','Подсолнухи'),item('.lavender','Лаванда'),item('#sun','Элемент с id sun'),item('[data-ready="yes"]','Готовые растения'),item(':first-child','Первый дочерний элемент'),item(':last-child','Последний дочерний элемент')]
  if(language==='css' && mode!=='selector') {
    const property=before.match(/([\w-]+)\s*:\s*[\w-]*$/)?.[1]
    if(property)choices=(cssValues[property]||[]).filter(v=>!(mode==='flex'&&v==='stretch')).map(v=>item(v,`Значение ${property}`))
  }
  if(mode==='robot') {
    const call=language==='csharp'?'Hero.Move':language==='go'?'hero.Move':'hero.move'
    const suffix=language==='csharp'||language==='javascript'?';':''
    choices=[item(call,'Переместить героя: right, left, up, down',`${call}("«right»")${suffix}`),...choices.filter(c=>c.label==='for')]
  }
  if(mode==='general' && language!=='css'&&language!=='html') {
    const names=[...new Set([...value.matchAll(/\b([A-Za-z_]\w*)\s*(?::=|=(?!=))|\b(?:def|function|func)\s+([A-Za-z_]\w*)/g)].map(m=>m[1]||m[2]))]
    choices=[...choices,...names.filter(n=>!choices.some(c=>c.label===n)).map(n=>item(n,'Имя из твоего кода'))]
  }
  const tail=value.slice(cursor).match(/^[\w-]*/)?.[0] || ''
  return {from:cursor-prefix.length,to:cursor+tail.length,items:choices.filter(c=>c.label.toLowerCase().startsWith(prefix.toLowerCase())).slice(0,9)}
}

export function expandCompletion(completion: Completion, indent: string, following: string) {
  // Completing a name before an existing call must not duplicate its arguments.
  const template=following.startsWith('(')&&completion.template.startsWith(completion.label+'(')?completion.label:completion.template
  const formatted=template.replace(/\n/g,'\n'+indent)
  const match=/«([^»]*)»/.exec(formatted)
  const text=formatted.replace(/«([^»]*)»/g,'$1')
  return {text,start:match?.index??text.length,end:match?match.index+match[1].length:text.length}
}

export interface CodeEdit { value: string; start: number; end: number }
export function editKey(value: string, start: number, end: number, key: string, language: LanguageId, shift=false): CodeEdit | null {
  const replace=(text:string,selectionStart=start+text.length,selectionEnd=selectionStart)=>({value:value.slice(0,start)+text+value.slice(end),start:selectionStart,end:selectionEnd})
  const before=value.slice(0,start),context=lexicalContext(before,language),selected=value.slice(start,end)
  const pairs: Record<string,string>={'(':')','[':']','{':'}','"':'"',"'":"'"}
  if(key==='Tab') {
    if(start!==end||shift) {
      const from=value.lastIndexOf('\n',start-1)+1
      const to=end>start&&value[end-1]==='\n'?end-1:end
      const section=value.slice(from,to), lines=section.split('\n')
      let first=0,total=0
      const text=lines.map((line,i)=>{const n=shift?-(line.match(/^(?: {1,4}|\t)/)?.[0].length||0):4; if(!i)first=n;total+=n;return n<0?line.slice(-n):n?'    '+line:line}).join('\n')
      return {value:value.slice(0,from)+text+value.slice(to),start:Math.max(from,start+first),end:Math.max(from,end+total)}
    }
    return replace('    ')
  }
  if(key==='Enter') {
    const line=before.slice(before.lastIndexOf('\n')+1),indent=line.match(/^\s*/)?.[0]||''
    const extra=!context.comment&&!context.quote&&((language==='python'&&line.trimEnd().endsWith(':'))||/[{[(]$/.test(line.trimEnd()))?'    ':''
    const close=extra&&start===end&&/[}\])]/.test(value[end]||'')?'\n'+indent:''
    return replace('\n'+indent+extra+close,start+1+indent.length+extra.length)
  }
  if(context.comment)return null
  if(start===end && ')]}\'"'.includes(key)&&value[start]===key) {
    const escaped=/(?:^|[^\\])(?:\\\\)*\\$/.test(before)
    if(!escaped&&(!context.quote||context.quote===key))return {value,start:start+1,end:start+1}
  }
  if(key==='Backspace'&&start===end&&pairs[value[start-1]]===value[start])return {value:value.slice(0,start-1)+value.slice(start+1),start:start-1,end:start-1}
  if(context.quote)return null
  if(pairs[key] && (selected||!value[end]||/[\s)\]}:;,]/.test(value[end])))return replace(key+selected+pairs[key],start+1,start+1+selected.length)
  return null
}
