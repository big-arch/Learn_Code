export type MusicMood = 'lofi' | 'ambient'
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
  private readonly chords = [[48,55,59,62,67],[45,52,55,59,64],[50,57,60,64,69],[43,50,53,57,62]]
  setVolume(value: number) { this.volume = Math.max(0,Math.min(1,value)); if(this.context&&this.master)this.master.gain.setTargetAtTime(this.active?this.volume*0.42:0,this.context.currentTime,0.12) }
  setMood(mood: MusicMood) { this.mood=mood }
  async play() {
    if(!this.context){
      const ctx=new AudioContext();this.context=ctx
      this.master=ctx.createGain();this.master.gain.value=0
      const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=3
      this.master.connect(compressor);compressor.connect(ctx.destination)
      this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate)
      const channel=this.noise.getChannelData(0);let seed=8341
      for(let i=0;i<channel.length;i++){seed=(seed*16807)%2147483647;channel[i]=seed/1073741823.5-1}
    }
    await this.context.resume()
    this.active=true;this.setVolume(this.volume);this.nextTime=this.context.currentTime+0.1
    if(this.timer)clearInterval(this.timer)
    this.schedule();this.timer=setInterval(()=>this.schedule(),100)
  }
  pause(){this.active=false;if(this.timer)clearInterval(this.timer);this.timer=null;if(this.context&&this.master)this.master.gain.setTargetAtTime(0,this.context.currentTime,0.08)}
  async dispose(){this.pause();await this.context?.close();this.context=null}
  private note(midi:number,time:number,duration:number,volume:number,bass=false){
    const ctx=this.context!,gain=ctx.createGain(),filter=ctx.createBiquadFilter()
    filter.type='lowpass';filter.frequency.value=bass?420:1700;filter.Q.value=0.5
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
    const ctx=this.context,beat=60/74/4
    if(this.nextTime<ctx.currentTime)this.nextTime=ctx.currentTime+0.05
    while(this.nextTime<ctx.currentTime+1.5){
      const step=this.tick%16,chord=this.chords[Math.floor(this.tick/32)%4],time=this.nextTime+(step%2?0.025:0)
      if(step===0||step===7||step===12)chord.slice(1).forEach((note,i)=>this.note(note,time+i*0.018,step===0?2.2:1.4,0.055))
      if(step===0||step===8)this.note(chord[0]-12,time,1.3,0.15,true)
      if(this.tick%32===10||this.tick%32===26)this.note(chord[3]+12,time,1.8,0.03)
      if(this.mood==='lofi'){if([0,6,8].includes(step))this.percussion(time,'kick');if(step===4||step===12)this.percussion(time+0.02,'snare');if(step%2===0)this.percussion(time,'hat')}
      this.nextTime+=beat;this.tick++
    }
  }
}
