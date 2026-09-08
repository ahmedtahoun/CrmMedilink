import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface AttachmentFile {
  name: string
  path: string
  size: number
  createdAt: string
}

export function useClinicAttachments(clinicId: string | null) {
  const [files, setFiles] = useState<AttachmentFile[]>([])
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!clinicId) return
    let cancelled = false
    supabase.storage
      .from('attachments')
      .list(`clinics/${clinicId}`, { sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data }) => {
        if (cancelled) return
        setFiles(
          (data ?? [])
            .filter((f) => f.id) // skip folder placeholders
            .map((f) => ({
              name: f.name,
              path: `clinics/${clinicId}/${f.name}`,
              size: (f.metadata?.size as number) ?? 0,
              createdAt: f.created_at ?? '',
            })),
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clinicId, tick])

  return { files, loading, reload }
}

export async function uploadClinicAttachment(clinicId: string, file: File): Promise<string | null> {
  const path = `clinics/${clinicId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: false })
  return error ? error.message : null
}

export async function signedAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 60)
  return error ? null : data.signedUrl
}

export async function deleteClinicAttachment(path: string): Promise<string | null> {
  const { error } = await supabase.storage.from('attachments').remove([path])
  return error ? error.message : null
}
