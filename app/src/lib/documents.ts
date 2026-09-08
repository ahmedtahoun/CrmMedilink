import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { CountryDocument } from './types'

export function useCountryDocuments() {
  const [docs, setDocs] = useState<CountryDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('country_documents')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setDocs((data as CountryDocument[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { docs, loading, reload }
}

export async function uploadCountryDocument(
  country: string,
  file: File,
  uploadedBy: string | null,
): Promise<string | null> {
  const path = `${country}/${Date.now()}-${file.name}`
  const up = await supabase.storage.from('documents').upload(path, file, { upsert: false })
  if (up.error) return up.error.message
  const { error } = await supabase.from('country_documents').insert({
    country,
    name: file.name,
    storage_path: path,
    uploaded_by: uploadedBy,
  })
  return error ? error.message : null
}

export async function downloadCountryDocument(doc: CountryDocument): Promise<string | null> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 60)
  if (error) return null
  return data.signedUrl
}

export async function deleteCountryDocument(doc: CountryDocument): Promise<string | null> {
  await supabase.storage.from('documents').remove([doc.storage_path])
  const { error } = await supabase.from('country_documents').delete().eq('id', doc.id)
  return error ? error.message : null
}
