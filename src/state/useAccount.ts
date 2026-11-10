import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DeviceSession } from '../lib/deviceCode'
export interface AccountState { user:User|null; device:DeviceSession|null; setDevice:(device:DeviceSession|null)=>void; ready:boolean; configured:boolean; open:boolean; setOpen:(open:boolean)=>void; authError:string }
export const AccountContext=createContext<AccountState>({user:null,device:null,setDevice:()=>{},ready:true,configured:false,open:false,setOpen:()=>{},authError:''})
export const useAccount=()=>useContext(AccountContext)
