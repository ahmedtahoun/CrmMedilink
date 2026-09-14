// MediLink360 — delete every file in the `documents` Storage bucket.
//
// Supabase blocks direct SQL deletes on storage.objects, so the bucket has
// to be cleared through the Storage API instead of reset_to_live.sql. This
// script recursively lists every file in the bucket and removes it.
//
// Usage (run from the app/ directory, where @supabase/supabase-js is
// already installed as a dependency):
//
//   SUPABASE_URL="https://<project-ref>.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="<service role key, NOT the anon key>" \
//   node supabase/clear_documents_bucket.mjs
//
// Get the service role key from Supabase → Project Settings → API →
// service_role secret. Never put it in .env.local or commit it anywhere —
// pass it inline on the command line as shown above and it only lives in
// your shell history.
//
// Alternative if you'd rather not touch the terminal: Supabase Dashboard →
// Storage → documents → select all → Delete.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'documents'

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first (see the header comment).')
  process.exit(1)
}

const supabase = createClient(url, key)

async function listAllPaths(prefix = '') {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw error
  let paths = []
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id === null) {
      // Folder placeholder (no id) — recurse into it.
      paths = paths.concat(await listAllPaths(full))
    } else {
      paths.push(full)
    }
  }
  return paths
}

const paths = await listAllPaths()
console.log(`Found ${paths.length} file(s) in '${BUCKET}'.`)

if (paths.length === 0) {
  console.log('Nothing to delete.')
  process.exit(0)
}

for (let i = 0; i < paths.length; i += 100) {
  const batch = paths.slice(i, i + 100)
  const { error } = await supabase.storage.from(BUCKET).remove(batch)
  if (error) throw error
  console.log(`Deleted ${batch.length} file(s) (${Math.min(i + 100, paths.length)}/${paths.length}).`)
}

console.log('Done — the documents bucket is empty.')
