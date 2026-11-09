import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, UIEvent } from 'react'
import type { LanguageId } from '../types'
import { editKey, expandCompletion, getCompletions } from '../lib/codeAssist'
import type { AssistMode, CodeEdit, Completion } from '../lib/codeAssist'
import './code-assist.css'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  onRun: () => void
  language: LanguageId
  mode?: AssistMode
  label?: string
  readOnly?: boolean
  maxLength?: number
  placeholder?: string
  onScroll?: (event: UIEvent<HTMLTextAreaElement>) => void
}
interface Menu { value: string; from: number; to: number; items: Completion[]; top: number; listHeight: number }

export function AssistedCodeInput({id,value,onChange,onRun,language,mode='general',label='Код решения',readOnly=false,maxLength=20000,placeholder,onScroll}: Props) {
  const uid=useId(), input=useRef<HTMLTextAreaElement>(null)
  const [automatic,setAutomatic]=useState(true),[menu,setMenu]=useState<Menu|null>(null),[active,setActive]=useState(0)
  const [notice,setNotice]=useState('')
  const current=useRef<CodeEdit>({value,start:0,end:0}),undo=useRef<CodeEdit[]>([]),redo=useRef<CodeEdit[]>([])
  const allowTabExit=useRef(false),composing=useRef(false),frame=useRef(0)
  const shown=menu?.value===value&&!readOnly?menu:null

  useEffect(()=>{
    // Remote sync, lesson navigation and reset start a new editing history.
    if(current.current.value!==value){current.current={value,start:0,end:0};undo.current=[];redo.current=[];setMenu(null)}
  },[value])
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[])
  useEffect(()=>{document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({block:'nearest'})},[active,uid])

  function selection(edit:CodeEdit) {
    cancelAnimationFrame(frame.current)
    frame.current=requestAnimationFrame(()=>{
      if(input.current&&input.current.value===edit.value){input.current.focus({preventScroll:true});input.current.setSelectionRange(edit.start,edit.end)}
    })
  }
  function remember() {
    undo.current.push({...current.current});if(undo.current.length>100)undo.current.shift();redo.current=[]
  }
  function commit(edit:CodeEdit,save=true) {
    if(readOnly)return
    if(edit.value.length>maxLength){setNotice(`Не более ${maxLength} символов`);return}
    if(edit.value!==value&&save)remember()
    current.current=edit;setMenu(null);setNotice('');onChange(edit.value);selection(edit)
  }
  function show(text:string,cursor:number,manual=false) {
    if(readOnly||composing.current||(!automatic&&!manual)){setMenu(null);return}
    const result=getCompletions(text,cursor,language,mode,manual)
    const el=input.current
    const style=el?getComputedStyle(el):null
    const lineHeight=parseFloat(style?.lineHeight||'28')||28
    const row=text.slice(0,cursor).split('\n').length
    const caret=(parseFloat(style?.paddingTop||'0')||0)+row*lineHeight-(el?.scrollTop||0)
    const height=Math.min(240,result.items.length*76+68,Math.max(120,(el?.clientHeight||280)-12))
    const top=(el?.offsetTop||0)+(caret+height<=(el?.clientHeight||280)?caret:Math.max(4,caret-lineHeight-height))
    setActive(0);setMenu(result.items.length?{value:text,...result,top,listHeight:height-68}:null)
    setNotice(manual&&!result.items.length?'В этой позиции нет подсказок':'')
  }
  function accept(option:Completion) {
    if(!shown)return
    const line=value.slice(0,shown.from).split('\n').pop()||''
    const expanded=expandCompletion(option,line.match(/^\s*/)?.[0]||'',value.slice(shown.to))
    commit({value:value.slice(0,shown.from)+expanded.text+value.slice(shown.to),start:shown.from+expanded.start,end:shown.from+expanded.end})
  }
  function travelHistory(back:boolean) {
    const source=back?undo:redo,target=back?redo:undo
    const previous=source.current.pop();if(!previous)return
    target.current.push({...current.current});commit(previous,false)
  }
  function keyDown(event:KeyboardEvent<HTMLTextAreaElement>) {
    if(composing.current||event.nativeEvent.isComposing||event.keyCode===229)return
    const el=event.currentTarget
    current.current={value,start:el.selectionStart,end:el.selectionEnd}
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();setMenu(null);onRun();return}
    if(readOnly)return
    if((event.ctrlKey||event.metaKey)&&event.code==='Space'){event.preventDefault();show(value,el.selectionStart,true);return}
    if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();travelHistory(event.key.toLowerCase()==='z'&&!event.shiftKey);return}
    if(event.ctrlKey||event.metaKey||event.altKey)return
    if(event.key==='Escape') {
      if(shown){event.preventDefault();event.stopPropagation();setMenu(null)}
      allowTabExit.current=true;return
    }
    if(shown) {
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActive(n=>(n+(event.key==='ArrowDown'?1:-1)+shown.items.length)%shown.items.length);return}
      if((event.key==='Tab'&&!event.shiftKey)||event.key==='Enter'){event.preventDefault();accept(shown.items[active]||shown.items[0]);return}
    }
    if(event.key==='Tab'&&allowTabExit.current){allowTabExit.current=false;setMenu(null);return}
    allowTabExit.current=false
    const edit=editKey(value,el.selectionStart,el.selectionEnd,event.key,language,event.shiftKey)
    if(edit){event.preventDefault();commit(edit)}else if(event.key.startsWith('Arrow')||event.key==='Home'||event.key==='End'){setMenu(null)}
  }
  return <div className="code-assist" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setMenu(null)}}>
    <textarea ref={input} id={id||uid} aria-label={label} aria-describedby={`${uid}-help`} aria-autocomplete={readOnly?'none':'list'} aria-controls={shown?`${uid}-list`:undefined} aria-activedescendant={shown?`${uid}-option-${active}`:undefined}
      value={value} readOnly={readOnly} maxLength={maxLength} placeholder={placeholder} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
      onKeyDown={keyDown} onScroll={e=>{setMenu(null);onScroll?.(e)}}
      onSelect={e=>{current.current={value:e.currentTarget.value,start:e.currentTarget.selectionStart,end:e.currentTarget.selectionEnd}}}
      onPointerDown={()=>setMenu(null)}
      onCompositionStart={()=>{composing.current=true;setMenu(null)}} onCompositionEnd={e=>{composing.current=false;show(e.currentTarget.value,e.currentTarget.selectionStart)}}
      onChange={e=>{
        const el=e.currentTarget
        remember();current.current={value:el.value,start:el.selectionStart,end:el.selectionEnd};onChange(el.value)
        if(el.selectionStart===el.selectionEnd)show(el.value,el.selectionStart);else setMenu(null)
      }}/>
    {!readOnly&&<div className="code-assist-bar">
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{const el=input.current;if(el){el.focus({preventScroll:true});show(value,el.selectionStart,true)}}} aria-expanded={Boolean(shown)}>Подсказки <kbd>Ctrl Space</kbd></button>
      <button type="button" aria-label="Автоподсказки" aria-pressed={automatic} onClick={()=>{setAutomatic(!automatic);setMenu(null)}}>Авто: {automatic?'вкл':'выкл'}</button>
    </div>}
    <span id={`${uid}-help`} className="assist-sr-only">Ctrl Space — подсказки. Стрелки — выбор, Tab или Enter — вставить, Escape — закрыть. Для выхода из редактора нажми Escape, затем Tab. Ctrl Enter — запустить. Ctrl Z — отменить.</span>
    {shown&&<div className="completion-panel" style={{top:shown.top}}>
      <div className="completion-heading"><span>Выбери команду</span><span>↑ ↓ · Tab ↵</span></div>
      <div role="listbox" id={`${uid}-list`} aria-label="Подсказки кода" className="completion-list" style={{maxHeight:shown.listHeight}}>{shown.items.map((option,i)=><button type="button" role="option" aria-selected={active===i} id={`${uid}-option-${i}`} key={option.label} tabIndex={-1} onMouseDown={e=>e.preventDefault()} onClick={()=>accept(option)} onPointerMove={()=>setActive(i)}><code>{option.label}</code><span>{option.detail}</span></button>)}</div>
      <div className="completion-caption">Вставь шаблон и заполни выделенное место · Esc — закрыть</div>
    </div>}
    <span className="assist-sr-only" role="status">{notice}</span>
  </div>
}
