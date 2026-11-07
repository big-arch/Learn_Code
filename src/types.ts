export type LanguageId = 'python' | 'csharp' | 'go' | 'javascript' | 'html' | 'css'

export type ViewId = 'home' | 'courses' | 'map' | 'arena' | 'progress' | 'research' | 'python' | 'adventure' | 'games'

export type Direction = 'right' | 'left' | 'up' | 'down'

export interface Point {
  x: number
  y: number
}

export interface CourseModule {
  title: string
  description: string
  lessons: number
}

export interface Mission {
  id: string
  title: string
  eyebrow: string
  briefing: string
  objective: string
  starterCode: string
  solution: string
  hint: string[]
  xp: number
  kind: 'robot' | 'html' | 'css'
  start?: Point
  goal?: Point
  requireLoop?: boolean
  expectedSteps?: number
  variant?: 'link' | 'center'
}

export interface Course {
  id: LanguageId
  name: string
  tagline: string
  description: string
  color: string
  level: 'Новичок' | 'Базовый'
  duration: string
  lessons: number
  project: string
  skills: string[]
  modules: CourseModule[]
  mission: Mission
}

export interface ProgressState {
  version: 1
  xp: number
  completed: string[]
  completedAt: Record<string, string>
  drafts: Record<string, string>
  activity: number[]
  streak: number
  lastCompletionDate: string | null
  sound: boolean
  motion: boolean
}

export interface TestResult {
  label: string
  passed: boolean
}

export interface ValidationResult {
  ok: boolean
  message: string
  commands: Direction[]
  positions: Point[]
  tests: TestResult[]
  lines?: number[]
}

export interface ResearchSource {
  name: string
  category: 'Игровое обучение' | 'Массовые курсы' | 'Свободная практика'
  strength: string
  borrowed: string
  url: string
}
