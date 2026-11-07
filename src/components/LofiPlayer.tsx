import { useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play } from 'lucide-react'
import { LofiEngine } from '../audio/lofi'
import type { MusicMood } from '../audio/lofi'
export function LofiPlayer() {
  const engine=useRef<LofiEngine|null>(null)
  const [playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [mood,setMood]=useState<MusicMood>('lofi')
  const [volume,setVolume]=useState(()=>{try{const v=Number(localStorage.getItem('arena-music-volume')??'30');return Number.isFinite(v)?Math.max(0,Math.min(100,v)):30}catch{return 30}})
  useEffect(()=>()=>{void engine.current?.dispose();engine.current=null},[])
  const toggle=async()=>{
    if(playing){engine.current?.pause();setPlaying(false);return}
    setBusy(true);setError('')
    try{engine.current??=new LofiEngine();engine.current.setVolume(volume/100);engine.current.setMood(mood);await engine.current.play();setPlaying(true)}catch{setError('Звук недоступен. Попробуй другой браузер.')}finally{setBusy(false)}
  }
  return <details className="music-dock"><summary><Headphones size={17}/><span>{playing?(mood==='lofi'?'Играет lofi':'Играет ambient'):'Музыка для фокуса'}</span><i className={playing?'playing':''}/></summary><aside className={'lofi-player '+(playing?'is-playing':'')} aria-label="Фоновая музыка">
    <div className="lofi-art"><Headphones size={22}/><i/><i/><i/></div>
    <div className="lofi-meta"><strong>{mood==='lofi'?'Тёплая орбита':'Тихий космос'}</strong><span>{playing?'Сейчас играет': 'Музыка для фокуса'} · {mood==='lofi'?'74 BPM':'ambient'}</span></div>
    <button type="button" className="music-toggle" onClick={()=>void toggle()} disabled={busy} aria-label={playing?'Остановить музыку':'Включить lofi'} aria-pressed={playing}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
    <div className="lofi-settings"><select aria-label="Настроение музыки" value={mood} onChange={e=>{const m=e.target.value as MusicMood;setMood(m);engine.current?.setMood(m)}}><option value="lofi">Lofi</option><option value="ambient">Без ударных</option></select><label><span>Громкость {volume}%</span><input type="range" min="0" max="100" value={volume} aria-label="Громкость музыки" onChange={e=>{const v=Number(e.target.value);setVolume(v);engine.current?.setVolume(v/100);try{localStorage.setItem('arena-music-volume',String(v))}catch{/* Optional preference. */}}}/></label></div>
    {error&&<p role="alert">{error}</p>}
  </aside></details>
}
