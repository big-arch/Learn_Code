import type { ProgressState } from '../types'
export const DEVICE_SESSION_KEY = 'learn-code-device-session-v1'
export const PENDING_DEVICE_KEY = 'learn-code-pending-device-code-v1'
export interface DeviceSession { id: string; code: string; initial?: ProgressState }

export function normalizeDeviceCode(value: string): string | null {
  const compact = value.replace(/[\s-]/g, '').toUpperCase()
  return /^LC[A-F0-9]{40}$/.test(compact) ? 'LC-' + compact.slice(2).match(/.{8}/g)!.join('-') : null
}

export function createDeviceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return normalizeDeviceCode('LC' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''))!
}

export function readDeviceSession(): DeviceSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(DEVICE_SESSION_KEY) || 'null')
    const code = typeof value?.code === 'string' ? normalizeDeviceCode(value.code) : null
    return code && typeof value.id === 'string' && /^[a-f0-9-]{36}$/.test(value.id) ? { id: value.id, code } : null
  } catch { return null }
}
