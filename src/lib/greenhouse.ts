import data from '../data/greenhouse.json'
import type { PythonCheck } from '../data/pythonCourse'
import type { PythonVariable } from './pythonRunner'
export const greenhouseLessons=data
export type GreenLesson=typeof data[number]
export type Sensors={moisture:number;temperature:number;tank:number}
export const defaultSensors:Sensors={moisture:28,temperature:32,tank:5}
export const greenFormats:Record<string,string>={predict:'Предскажи результат',experiment:'Проведи эксперимент',order:'Собери программу',debug:'Найди ошибку',choose:'Выбери правило',code:'Напиши самостоятельно'}
export function greenText(text:string,review=false){return text.replaceAll('LIMIT',review?'45':'35').replaceAll('HEAT',review?'30':'28')}
export function greenSource(fragment:string,sensors:Sensors){return `moisture = ${sensors.moisture}\ntemperature = ${sensors.temperature}\ntank = ${sensors.tank}\n${fragment}`}
export function greenChecks(index:number,review=false):PythonCheck[]{
  const limit=review?45:35,heat=review?30:28
  const cases:Sensors[]=[{moisture:limit-1,temperature:heat+1,tank:5},{moisture:limit,temperature:heat,tank:5},{moisture:limit+1,temperature:heat-1,tank:5}]
  if(index===4||index===6)cases.push({moisture:10,temperature:heat+2,tank:0},{moisture:90,temperature:heat+1,tank:5},{moisture:10,temperature:heat-2,tank:2})
  if(index===7)cases.push({moisture:-5,temperature:20,tank:5},{moisture:101,temperature:20,tank:5},{moisture:0,temperature:20,tank:5},{moisture:100,temperature:20,tank:5})
  return cases.map(s=>{
    const values:Record<string,boolean|string>=index===7?{mode:s.moisture<0||s.moisture>100?'ошибка':s.moisture<limit?'полив':'пауза'}:index===5?{fan:s.temperature>heat}:{water:s.moisture<limit&&(!(index===4||index===6)||s.tank>0),...(index===6?{fan:s.temperature>heat}:{})}
    const literal=JSON.stringify(s),conditions=Object.entries(values).map(([key,value])=>typeof value==='boolean'?`v.get('${key}') is ${value?'True':'False'}`:`v.get('${key}') == '${value}'`).join(' and ')
    return {label:`Влажность ${s.moisture}% · ${s.temperature}°C · бак ${s.tank} л → ${Object.entries(values).map(([k,v])=>k+' = '+(typeof v==='boolean'?(v?'True':'False'):v)).join(', ')}`,expression:`(lambda v: ${conditions})(__rerun__(${literal}))`}
  })
}
export function greenState(variables:PythonVariable[]){
 const bool=(name:string)=>{const v=variables.find(v=>v.name===name);return v?.type==='bool'?v.value==='True':null}
 const mode=variables.find(v=>v.name==='mode'&&v.type==='str')?.value.replace(/^['"]|['"]$/g,'')??''
 return {water:mode?mode==='полив':bool('water'),fan:bool('fan'),mode}
}
