import { supabase } from './supabase'
import type { Role } from './constants'

// The Supabase Edge Function slug that creates auth users server-side.
// (Deployed via the dashboard, which auto-slugged it "swift-handler".)
const CREATE_USER_FN = 'swift-handler'

export interface NewTeamUser {
  name: string
  email: string
  password: string
  role: Role
}

/** Calls the create-user Edge Function (server-side service-role). */
export async function createTeamUser(
  input: NewTeamUser,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke(CREATE_USER_FN, { body: input })
  if (error) {
    // functions.invoke surfaces the HTTP error; try to read the JSON body it returned
    let msg = error.message
    try {
      const ctx = (error as unknown as { context?: Response }).context
      if (ctx) {
        const body = await ctx.json()
        if (body?.error) msg = body.error
      }
    } catch {
      /* keep msg */
    }
    return { ok: false, error: msg }
  }
  if (data?.error) return { ok: false, error: data.error }
  return { ok: true }
}
