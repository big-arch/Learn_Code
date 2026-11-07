import data from './python-course.json'
import reading from './python-reading.json'
export interface PythonCheck { label: string; expression: string }
export interface PythonLesson {
  reading: typeof reading[number]
  id: string; title: string; chapter: number; story: string; theory: string[]
  example: string; exampleOutput: string; task: string; starter: string; solution: string
  checks: PythonCheck[]; quiz: { question: string; options: string[]; correct: number; explanation: string }
  hints: string[]; stdin: string; xp: number; minutes: number
}
export const pythonLessons: PythonLesson[] = data.lessons.map((lesson,i)=>({...lesson,reading:reading[i]}))
export const pythonChapters = data.chapters
export const pythonProgressItems = pythonLessons.flatMap(l => [{ id: l.id, xp: l.xp }, { id: l.id + '-quiz', xp: 10 }])
