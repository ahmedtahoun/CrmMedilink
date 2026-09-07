import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import {
  ACCESS_MODULE_KEYS,
  ACCESS_ROLE_KEYS,
  WORKSPACE_ITEMS,
  type AccessModuleKey,
  type Role,
  type Workspace,
} from './constants'
import type { AccessMatrix } from './types'

export const DEFAULT_ACCESS_MATRIX: AccessMatrix = {
  marketing: { ceo: false, providers: false, closer: false, trainer: false, documents: true, hr: false, faq: true },
  operations: { ceo: false, providers: true, closer: true, trainer: true, documents: true, hr: false, faq: true },
  trainerSales: { ceo: false, providers: false, closer: true, trainer: true, documents: false, hr: false, faq: true },
  reception: { ceo: false, providers: true, closer: false, trainer: false, documents: false, hr: false, faq: true },
}

/** Map an auth Role to the access-matrix column that gates its non-CEO views. */
const roleToAccessKey: Partial<Record<Role, keyof AccessMatrix>> = {
  Sales: 'trainerSales',
  Trainer: 'trainerSales',
}

export function visibleWorkspaces(role: Role, matrix: AccessMatrix): Set<Workspace> {
  if (role === 'CEO' || role === 'Admin') {
    return new Set(WORKSPACE_ITEMS.map((w) => w.key))
  }
  const col = roleToAccessKey[role]
  const out = new Set<Workspace>(['faq'])
  if (col) {
    for (const mod of ACCESS_MODULE_KEYS) {
      if (matrix[col]?.[mod]) out.add(mod as Workspace)
    }
  }
  // finance is not in the access matrix; grant it to non-CEO only alongside closer/trainer
  if (out.has('closer') || out.has('trainer')) out.add('finance')
  return out
}

function normalize(rows: { role_key: string; module_key: string; allowed: boolean }[]): AccessMatrix {
  const m: AccessMatrix = JSON.parse(JSON.stringify(DEFAULT_ACCESS_MATRIX))
  for (const r of rows) {
    if (
      (ACCESS_ROLE_KEYS as readonly string[]).includes(r.role_key) &&
      (ACCESS_MODULE_KEYS as readonly string[]).includes(r.module_key)
    ) {
      m[r.role_key as keyof AccessMatrix][r.module_key as AccessModuleKey] = r.allowed
    }
  }
  return m
}

export function useAccessMatrix(): { matrix: AccessMatrix; reload: () => void } {
  const [matrix, setMatrix] = useState<AccessMatrix>(DEFAULT_ACCESS_MATRIX)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    supabase
      .from('access_matrix')
      .select('role_key, module_key, allowed')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        setMatrix(normalize(data))
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { matrix, reload: () => setTick((t) => t + 1) }
}

export async function setAccessCell(
  roleKey: keyof AccessMatrix,
  moduleKey: AccessModuleKey,
  allowed: boolean,
): Promise<string | null> {
  const { error } = await supabase
    .from('access_matrix')
    .upsert({ role_key: roleKey, module_key: moduleKey, allowed }, { onConflict: 'role_key,module_key' })
  return error ? error.message : null
}
