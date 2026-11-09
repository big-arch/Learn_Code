import type { ProgressState } from '../types'
import { initialProgress, normalizeProgress } from './storage'
import { mergeProgress, sameProgress } from './progressMerge'
import type { DraftConflict } from './progressMerge'

export interface CloudRow { state: ProgressState; revision: number; epoch: number }
export interface CloudReply extends CloudRow { accepted: boolean }
export type CloudTransport = (revision?: number, state?: ProgressState, reset?: boolean) => Promise<CloudReply>
interface Snapshot { progress: ProgressState; status: string; conflicts: Record<string,DraftConflict>; ready: boolean; backup: ProgressState | null }
interface Cache { row:CloudRow; progress:ProgressState; conflicts:Record<string,DraftConflict>; backup:ProgressState|null }
export class CloudProgressStore {
  private row: CloudRow = {state:initialProgress,revision:0,epoch:0}
  private listeners = new Set<() => void>()
  private busy = false
  private stopped = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private initialized = false
  private key: string
  private transport: CloudTransport
  private storage: Pick<Storage,'getItem'|'setItem'>
  private snapshot: Snapshot
  constructor(userId:string, transport:CloudTransport, storage:Pick<Storage,'getItem'|'setItem'> = localStorage) {
    this.transport=transport;this.storage=storage
    this.key = 'code-arena:cloud:' + userId
    let cache:Cache|null=null
    try { cache=JSON.parse(storage.getItem(this.key)||'null') } catch { /* Empty or damaged local cache. */ }
    if(cache?.row && Number.isSafeInteger(cache.row.revision) && Number.isSafeInteger(cache.row.epoch)) {
      this.row={...cache.row,state:normalizeProgress(cache.row.state)}; this.initialized=true
    }
    this.snapshot={progress:cache?normalizeProgress(cache.progress):initialProgress,status:'Подключаем облако…',conflicts:cache?.conflicts||{},ready:false,backup:cache?.backup||null}
  }
  getSnapshot=()=>this.snapshot
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener)}
  private update(values:Partial<Snapshot>) {
    if(this.stopped)return
    this.snapshot={...this.snapshot,...values}
    try { this.storage.setItem(this.key,JSON.stringify({row:this.row,progress:this.snapshot.progress,conflicts:this.snapshot.conflicts,backup:this.snapshot.backup})) }
    catch { this.snapshot={...this.snapshot,status:'Хранилище браузера недоступно. Не закрывай страницу до сохранения в облаке.'} }
    this.listeners.forEach(f=>f())
  }
  start=()=>{this.stopped=false;void this.sync()}
  dispose=()=>{this.stopped=true;clearTimeout(this.timer)}
  change=(action:(state:ProgressState)=>ProgressState)=>{
    const progress=action(this.snapshot.progress)
    const conflicts={...this.snapshot.conflicts}
    for(const id of Object.keys(conflicts)) if(progress.drafts[id]!==this.snapshot.progress.drafts[id]) conflicts[id]={...conflicts[id],local:progress.drafts[id]??''}
    this.update({progress,conflicts,status:'Есть изменения · сохраняем…'})
    clearTimeout(this.timer);this.timer=setTimeout(()=>void this.sync(),650)
  }
  importGuest=(guest:ProgressState)=>{
    const result=mergeProgress(initialProgress,guest,this.snapshot.progress)
    this.update({progress:normalizeProgress(result.state),conflicts:{...this.snapshot.conflicts,...result.conflicts}})
    void this.sync()
  }
  resolve=(id:string,choice:'local'|'remote')=>{
    const conflict=this.snapshot.conflicts[id]
    if(!conflict)return
    const conflicts={...this.snapshot.conflicts};delete conflicts[id]
    this.update({conflicts,progress:{...this.snapshot.progress,drafts:{...this.snapshot.progress.drafts,[id]:conflict[choice]}}})
    void this.sync()
  }
  sync=async()=>{
    if(this.busy||this.stopped)return
    this.busy=true
    try {
      this.update({status:'Синхронизируем…'})
      let remote=await this.transport()
      if(this.stopped)return
      if(this.initialized && remote.epoch!==this.row.epoch) {
        const backup=this.snapshot.progress
        this.row={...remote,state:normalizeProgress(remote.state)}
        this.update({progress:this.row.state,conflicts:{},backup,ready:true,status:'Прогресс сброшен на другом устройстве. Предыдущая локальная копия сохранена в резерве.'})
        return
      }
      if(!this.initialized) {
        this.initialized=true;this.row={...remote,state:normalizeProgress(remote.state)}
        const imported=mergeProgress(initialProgress,this.snapshot.progress,this.row.state)
        this.update({progress:normalizeProgress(imported.state),conflicts:{...this.snapshot.conflicts,...imported.conflicts},ready:true})
      }
      for(let attempt=0;attempt<4;attempt++) {
        const before=this.snapshot.progress
        const result=mergeProgress(this.row.state,before,normalizeProgress(remote.state))
        const conflicts={...this.snapshot.conflicts,...result.conflicts}
        // A conflict is never uploaded automatically; both versions remain available to the learner.
        for(const id of Object.keys(conflicts)) result.state.drafts[id]=remote.state.drafts[id] ?? ''
        const candidate=normalizeProgress(result.state)
        const reply=sameProgress(candidate,normalizeProgress(remote.state))?{...remote,accepted:true}:await this.transport(remote.revision,candidate)
        if(this.stopped)return
        if(!reply.accepted) {
          if(reply.epoch!==remote.epoch) {
            const backup=this.snapshot.progress
            this.row={...reply,state:normalizeProgress(reply.state)}
            this.update({progress:this.row.state,conflicts:{},backup,ready:true,status:'Прогресс сброшен на другом устройстве. Локальная копия сохранена в резерве.'})
            return
          }
          remote=reply;continue
        }
        this.row={...reply,state:normalizeProgress(reply.state)}
        const during=mergeProgress(before,this.snapshot.progress,this.row.state)
        const combined={...conflicts,...during.conflicts}
        for(const [id,c] of Object.entries(combined)) during.state.drafts[id]=c.local
        this.update({progress:normalizeProgress(during.state),conflicts:combined,ready:true,status:Object.keys(combined).length?'Выбери версию изменённых черновиков в аккаунте':'Сохранено в облаке'})
        return
      }
      this.update({ready:true,status:'На другом устройстве идут изменения. Повторим синхронизацию.'})
    } catch {
      this.update({ready:true,status:'Нет связи с облаком · изменения сохранены на этом устройстве'})
    } finally {
      this.busy=false
      if(!this.stopped && !sameProgress(this.snapshot.progress,this.row.state) && !Object.keys(this.snapshot.conflicts).length) {
        clearTimeout(this.timer);this.timer=setTimeout(()=>void this.sync(),5000)
      }
    }
  }
  report=(status:string)=>this.update({status})
  reset=async()=>{
    if(this.busy)throw Error('Дождись окончания синхронизации и повтори сброс.')
    this.busy=true
    try {
      const current=await this.transport()
      const reply=await this.transport(current.revision,initialProgress,true)
      if(!reply.accepted)throw Error('Прогресс изменился на другом устройстве. Повтори сброс.')
      const backup=this.snapshot.progress
      this.row={...reply,state:normalizeProgress(reply.state)}
      this.update({progress:this.row.state,conflicts:{},backup,status:'Прогресс аккаунта сброшен',ready:true})
    } finally {this.busy=false}
  }
}
