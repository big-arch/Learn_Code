import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
export interface AccountState { user:User|null; ready:boolean; configured:boolean; open:boolean; setOpen:(open:boolean)=>void; authError:string }
export const AccountContext=createContext<AccountState>({user:null,ready:true,configured:false,open:false,setOpen:()=>{},authError:''})
export const useAccount=()=>useContext(AccountContext)
