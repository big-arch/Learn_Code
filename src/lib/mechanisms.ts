import data from '../data/mechanism-missions.json'
import type { PythonVariable } from './pythonRunner'
export const mechanismMissions=data
export type Device='power'|'water'|'speed'|'label'
export interface MechanismState {power:number;water:number;speed:number;label:string}
export const devices: {id:Device;title:string;description:string;max:number}[]=[
  {id:'power',title:'Фонарь',description:'power задаёт количество горящих секций. Принимает число от 0 до 12.',max:12},
  {id:'water',title:'Насос',description:'water задаёт уровень воды в баке: от 0 до 10 литров.',max:10},
  {id:'speed',title:'Турбина',description:'speed управляет вращением лопастей: число от 0 до 8.',max:8},
  {id:'label',title:'Табличка',description:'label содержит текст, который увидят жители.',max:0},
]
export function mechanismState(vars:PythonVariable[]):MechanismState {
  const number=(name:string,max:number)=>{
    const v=vars.find(v=>v.name===name),n=v&&['int','float'].includes(v.type)?Number(v.value):0
    return Number.isFinite(n)?Math.max(0,Math.min(max,n||0)):0
  }
  const text=vars.find(v=>v.name==='label'&&v.type==='str')?.value||''
  return {power:number('power',12),water:number('water',10),speed:number('speed',8),label:text.replace(/^['"]|['"]$/g,'').replace(/\\n/g,' ').replace(/\\(['"\\])/g,'$1')}
}
export function pythonHelp(error:string) {
  if(error.startsWith('NameError'))return 'Python встретил неизвестное имя. Проверь написание переменной и создай её до использования.'
  if(error.startsWith('SyntaxError'))return 'Проверь знаки =, кавычки и скобки на указанной строке.'
  if(error.startsWith('TypeError'))return 'Здесь встретились несовместимые типы. Числовую строку можно преобразовать с помощью int().'
  if(error.startsWith('ValueError'))return 'Это значение не удалось преобразовать. Например, int() ждёт строку с целым числом.'
  if(error.startsWith('IndentationError'))return 'Проверь отступы. В этих заказах обычные присваивания начинаются с начала строки.'
  return 'Измени программу и попробуй ещё раз. Черновик сохранён.'
}
