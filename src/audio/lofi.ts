export type MusicMood = 'lofi' | 'ambient'
export const musicTracks = [
  {id:'harbour',name:'Тёплый причал',mood:'lofi',bpm:74,chords:[[48,55,59,62,67],[45,52,55,59,64],[50,57,60,64,69],[43,50,53,57,62]],melody:[72,76,79,74,71,69,67,74],tone:1800},
  {id:'rain',name:'Дождь в мастерской',mood:'lofi',bpm:66,chords:[[50,57,60,64,69],[46,53,57,60,65],[53,60,64,67,72],[48,55,58,62,67]],melody:[77,76,72,69,74,72,65,69],tone:1200},
  {id:'tram',name:'Ночной трамвай',mood:'lofi',bpm:84,chords:[[43,50,54,57,62],[47,54,57,61,66],[48,55,59,62,67],[45,52,55,59,64]],melody:[74,78,81,78,76,74,71,69],tone:2300},
  {id:'lanterns',name:'Бумажные фонари',mood:'lofi',bpm:78,chords:[[51,58,62,65,70],[48,55,58,62,67],[53,60,63,67,72],[46,53,57,60,65]],melody:[79,77,74,70,72,75,77,74],tone:2000},
  {id:'bay',name:'Тихая бухта',mood:'ambient',bpm:60,chords:[[48,55,60,64,71],[53,60,65,69,76],[45,52,57,60,67],[43,50,55,59,66]],melody:[76,79,83,79,74,71,67,72],tone:1400},
  {id:'orbit',name:'Орбита сна',mood:'ambient',bpm:56,chords:[[49,56,61,65,68],[46,53,58,61,65],[54,61,66,70,73],[44,51,56,60,63]],melody:[73,80,77,75,70,68,75,77],tone:1100},
] as const
export type MusicTrackId = typeof musicTracks[number]['id']
export class LofiEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private nextTime = 0
  private tick = 0
  private noise: AudioBuffer | null = null
  private volume = 0.3
  private mood: MusicMood = 'lofi'
  private active = false
  private track:MusicTrackId='harbour'
  private autoAdvance=true
  private onTrack?: (id:MusicTrackId)=>void
  constructor(onTrack?:(id:MusicTrackId)=>void){this.onTrack=onTrack}
  setAutoAdvance(value:boolean){this.autoAdvance=value}
  setTrack(id:MusicTrackId){
    if(!musicTracks.some(t=>t.id===id))return
    this.track=id;this.mood=musicTracks.find(t=>t.id===id)!.mood;this.tick=0
    if(this.context){this.nextTime=this.context.currentTime+.25;if(this.active&&this.master){this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setTargetAtTime(0,this.context.currentTime,.08);this.master.gain.setTargetAtTime(this.volume*.42,this.context.currentTime+.22,.2)}}
    this.onTrack?.(id)
  }
  private advance(){const choices=musicTracks.filter(t=>t.mood===this.mood);const i=choices.findIndex(t=>t.id===this.track);this.setTrack(choices[(i+1)%choices.length].id)}
  setVolume(value: number) { this.volume = Math.max(0,Math.min(1,value)); if(this.context&&this.master){this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setTargetAtTime(this.active?this.volume*0.42:0,this.context.currentTime,0.12)} }
  setMood(mood: MusicMood) { this.mood=mood;if(musicTracks.find(t=>t.id===this.track)!.mood!==mood)this.setTrack(musicTracks.find(t=>t.mood===mood)!.id) }
  async play() {
    if(!this.context){
      const ctx=new AudioContext();this.context=ctx
      this.master=ctx.createGain();this.master.gain.value=0
      const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=3
      this.master.connect(compressor);compressor.connect(ctx.destination)
      const delay=ctx.createDelay(1),feedback=ctx.createGain(),wet=ctx.createGain()
      delay.delayTime.value=.31;feedback.gain.value=.22;wet.gain.value=.13
      this.master.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compressor)
      this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate)
      const channel=this.noise.getChannelData(0);let seed=8341
      for(let i=0;i<channel.length;i++){seed=(seed*16807)%2147483647;channel[i]=seed/1073741823.5-1}
    }
    await this.context.resume()
    this.active=true;this.setVolume(this.volume);this.nextTime=this.context.currentTime+0.1
    if(this.timer)clearInterval(this.timer)
    this.schedule();this.timer=setInterval(()=>this.schedule(),100)
  }
  pause(){this.active=false;if(this.timer)clearInterval(this.timer);this.timer=null;if(this.context&&this.master){this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setTargetAtTime(0,this.context.currentTime,0.08)}}
  async dispose(){this.pause();await this.context?.close();this.context=null}
  private note(midi:number,time:number,duration:number,volume:number,bass=false){
    const ctx=this.context!,gain=ctx.createGain(),filter=ctx.createBiquadFilter()
    filter.type='lowpass';filter.frequency.value=bass?420:musicTracks.find(t=>t.id===this.track)!.tone;filter.Q.value=0.5
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,time+duration)
    filter.connect(gain);gain.connect(this.master!)
    const frequencies=bass?[1]:[1,2,3]
    frequencies.forEach((harmonic,i)=>{const osc=ctx.createOscillator(),partial=ctx.createGain();osc.type='sine';osc.frequency.value=440*Math.pow(2,(midi-69)/12)*harmonic;osc.detune.value=i===1?4:0;partial.gain.value=[1,0.2,0.04][i];osc.connect(partial);partial.connect(filter);osc.start(time);osc.stop(time+duration+0.02);osc.onended=()=>{osc.disconnect();partial.disconnect()}})
    setTimeout(()=>{filter.disconnect();gain.disconnect()},Math.max(0,(time-ctx.currentTime+duration+0.15)*1000))
  }
  private percussion(time:number,kind:'kick'|'snare'|'hat'){
    const ctx=this.context!,gain=ctx.createGain();gain.connect(this.master!)
    if(kind==='kick'){
      const osc=ctx.createOscillator();osc.frequency.setValueAtTime(125,time);osc.frequency.exponentialRampToValueAtTime(43,time+0.15);gain.gain.setValueAtTime(0.16,time);gain.gain.exponentialRampToValueAtTime(0.0001,time+0.25);osc.connect(gain);osc.start(time);osc.stop(time+0.26);osc.onended=()=>{osc.disconnect();gain.disconnect()}
    }else{
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=this.noise;filter.type='highpass';filter.frequency.value=kind==='hat'?6200:1500;source.connect(filter);filter.connect(gain)
      const duration=kind==='hat'?0.045:0.13
      gain.gain.setValueAtTime(kind==='hat'?0.018:0.045,time);gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);source.start(time);source.stop(time+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()}
    }
  }
  private schedule(){
    if(!this.active||!this.context)return
    const ctx=this.context
    if(this.nextTime<ctx.currentTime)this.nextTime=ctx.currentTime+.05
    while(this.nextTime<ctx.currentTime+.35){
      if(this.autoAdvance&&this.tick>=512)this.advance()
      const track=musicTracks.find(t=>t.id===this.track)!,beat=60/track.bpm/4
      const step=this.tick%16,bar=Math.floor(this.tick/16),section=Math.floor(bar/8)%4
      const chord=track.chords[Math.floor(bar/2)%4],time=this.nextTime+(step%2?.028:0)
      const ambient=this.mood==='ambient',sparse=section===2
      if(step===0||(!ambient&&!sparse&&(step===7||step===12)))chord.slice(1).forEach((note,i)=>this.note(note,time+i*.023,ambient?4.5:step===0?2.5:1.4,.045))
      if(step===0||(!ambient&&step===8))this.note(chord[0]-12,time,ambient?3:1.4,.12,true)
      if((ambient?step===4&&bar%2===0:[2,10,14].includes(step))&&!sparse){const note=track.melody[(bar*3+Math.floor(step/4))%track.melody.length];this.note(note+(section===3?-12:0),time,ambient?3.2:1.1,.034)}
      if(!ambient){
        if((bar%4===3?[0,6,10]:[0,8]).includes(step))this.percussion(time,'kick')
        if(step===4||step===12)this.percussion(time+.016,'snare')
        if(step%(sparse?4:2)===0)this.percussion(time,'hat')
        if(bar%8===7&&[13,15].includes(step))this.percussion(time,'hat')
      }
      this.nextTime+=beat;this.tick++
    }
  }
}
