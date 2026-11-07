import { useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play, SkipBack, SkipForward, Shuffle } from 'lucide-react'
import { LofiEngine, musicTracks } from '../audio/lofi'
import type { MusicMood, MusicTrackId } from '../audio/lofi'
export function LofiPlayer() {
  const engine=useRef<LofiEngine|null>(null)
  const [playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [trackId,setTrackId]=useState<MusicTrackId>(()=>{try{return musicTracks.find(t=>t.id===localStorage.getItem('arena-music-track'))?.id??'harbour'}catch{return 'harbour'}})
  const track=musicTracks.find(t=>t.id===trackId)!
  const [auto,setAuto]=useState(true)
  const [volume,setVolume]=useState(()=>{try{const v=Number(localStorage.getItem('arena-music-volume')??'30');return Number.isFinite(v)?Math.max(0,Math.min(100,v)):30}catch{return 30}})
  useEffect(()=>()=>{void engine.current?.dispose();engine.current=null},[])
  const remember=(id:MusicTrackId)=>{setTrackId(id);try{localStorage.setItem('arena-music-track',id)}catch{/* Optional preference. */}}
  const select=(id:MusicTrackId)=>{remember(id);engine.current?.setTrack(id)}
  const next=(direction:number)=>{const choices=musicTracks.filter(t=>t.mood===track.mood),i=choices.findIndex(t=>t.id===trackId);select(choices[(i+direction+choices.length)%choices.length].id)}
  const toggle=async()=>{
    if(playing){engine.current?.pause();setPlaying(false);return}
    setBusy(true);setError('')
    try{engine.current??=new LofiEngine(remember);engine.current.setVolume(volume/100);engine.current.setTrack(trackId);engine.current.setAutoAdvance(auto);await engine.current.play();setPlaying(true)}catch{setError('Звук недоступен. Попробуй другой браузер.')}finally{setBusy(false)}
  }
  return <details className="music-dock"><summary aria-label="Фоновая музыка"><Headphones size={17}/><span>{playing?track.name:'Музыка для фокуса'}</span><i className={playing?'playing':''}/></summary><aside className={'lofi-player '+(playing?'is-playing':'')} aria-label="Фоновая музыка">
    <div className="lofi-art"><Headphones size={22}/><i/><i/><i/></div><div className="lofi-meta"><strong>{track.name}</strong><span>{track.bpm} BPM · {track.mood==='lofi'?'Lofi':'Ambient'}</span></div>
    <div className="music-transport"><button type="button" aria-label="Предыдущая мелодия" onClick={()=>next(-1)}><SkipBack size={18}/></button><button type="button" className="music-toggle" onClick={()=>void toggle()} disabled={busy} aria-label={playing?'Остановить музыку':'Включить lofi'} aria-pressed={playing}>{playing?<Pause size={20}/>:<Play size={20}/>}</button><button type="button" aria-label="Следующая мелодия" onClick={()=>next(1)}><SkipForward size={18}/></button><button type="button" aria-label="Случайная мелодия" onClick={()=>{const choices=musicTracks.filter(t=>t.id!==trackId);select(choices[Math.floor(Math.random()*choices.length)].id)}}><Shuffle size={18}/></button></div>
    <div className="lofi-settings"><select aria-label="Настроение музыки" value={track.mood} onChange={e=>{const mood=e.target.value as MusicMood;select(musicTracks.find(t=>t.mood===mood)!.id)}}><option value="lofi">Lofi · с ритмом</option><option value="ambient">Ambient · без ударных</option></select><select aria-label="Выбрать мелодию" value={trackId} onChange={e=>select(e.target.value as MusicTrackId)}>{musicTracks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><label className="music-auto"><input type="checkbox" checked={auto} onChange={e=>{setAuto(e.target.checked);engine.current?.setAutoAdvance(e.target.checked)}}/>Автосмена мелодий</label><label><span>Громкость {volume}%</span><input type="range" min="0" max="100" value={volume} aria-label="Громкость музыки" onChange={e=>{const v=Number(e.target.value);setVolume(v);engine.current?.setVolume(v/100);try{localStorage.setItem('arena-music-volume',String(v))}catch{/* Optional preference. */}}}/></label></div>
    {error&&<p role="alert">{error}</p>}
  </aside></details>
}
