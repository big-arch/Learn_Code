import { supabase } from './supabaseClient'
import type { CloudReply } from './cloudProgress'
import type { ProgressState } from '../types'
import { normalizeDeviceCode } from './deviceCode'

export async function deviceSync(code: string, revision?: number, state?: ProgressState, reset = false, create = false): Promise<CloudReply & { id: string }> {
  const normalized = normalizeDeviceCode(code)
  if (!normalized) throw Error('Проверь код: скопируй его целиком, начиная с LC-.')
  if (!supabase) throw Error('Облачное сохранение не подключено.')
  const { data, error } = await supabase.rpc('learn_code_device_sync', {
    p_code: normalized, p_revision: revision ?? null, p_state: state ?? null, p_reset: reset, p_create: create,
  }).abortSignal(AbortSignal.timeout(12000))
  if (error) throw Error(error.code === 'P0002' || error.code === '22023'
    ? 'Код не найден. Скопируй личный код с первого устройства целиком.'
    : 'Не удалось подключить облако. Проверь интернет и повтори. Текущий прогресс сохранён.')
  return data
}
