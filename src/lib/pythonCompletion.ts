import type { ProgressState } from '../types'

export const PYTHON_PRACTICE_VERSION = 1

export function hasPassedPythonPractice(progress: ProgressState, lessonId: string) {
  return Object.values(progress.learning ?? {}).some(event =>
    event.lesson === lessonId && event.version === PYTHON_PRACTICE_VERSION &&
    event.kind === 'attempt' && event.variant === 'lesson' && event.passed)
}
