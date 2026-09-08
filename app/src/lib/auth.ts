import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import type { Profile } from './types'
import type { Role } from './constants'

export interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
}

/** Subscribe to the Supabase auth session + the signed-in user's profile row. */
export function useAuth(): AuthState {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile(s: Session | null) {
      if (!s) {
        if (!cancelled) setProfile(null)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .maybeSingle()
      if (!cancelled) setProfile((data as Profile) ?? null)
    }

    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      await loadProfile(data.session)
      if (!cancelled) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      loadProfile(s)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return { loading, session, profile }
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Backend not configured yet. Set Supabase env vars.'
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (!error) return null
  if (/invalid login credentials/i.test(error.message)) return 'That email or password is not right.'
  return error.message
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** Prototype "forgot password" == a request the CEO/Admin actions manually. */
export async function requestPasswordReset(email: string): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Backend not configured yet.'
  const { error } = await supabase.from('password_reset_requests').insert({
    email: email.trim().toLowerCase(),
  })
  return error ? error.message : null
}

export const isCeoOrAdmin = (role: Role | undefined): boolean =>
  role === 'CEO' || role === 'Admin'
