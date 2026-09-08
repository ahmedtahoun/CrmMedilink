import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { FaqCategory, FaqItem } from './types'

export function useFaq() {
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('faq_categories').select('*').order('sort', { ascending: true }),
      supabase.from('faq_items').select('*').order('sort', { ascending: true }),
    ]).then(([c, i]) => {
      if (cancelled) return
      setCategories((c.data as FaqCategory[]) ?? [])
      setItems((i.data as FaqItem[]) ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { categories, items, loading, reload }
}

export async function addFaqCategory(name: string, sort: number): Promise<string | null> {
  const { error } = await supabase.from('faq_categories').insert({ name, sort })
  return error ? error.message : null
}
export async function renameFaqCategory(id: string, name: string): Promise<string | null> {
  const { error } = await supabase.from('faq_categories').update({ name }).eq('id', id)
  return error ? error.message : null
}
export async function deleteFaqCategory(id: string): Promise<string | null> {
  const { error } = await supabase.from('faq_categories').delete().eq('id', id)
  return error ? error.message : null
}
export async function addFaqItem(categoryId: string, q: string, a: string, sort: number): Promise<string | null> {
  const { error } = await supabase.from('faq_items').insert({ category_id: categoryId, q, a, sort })
  return error ? error.message : null
}
export async function updateFaqItem(id: string, patch: Partial<Pick<FaqItem, 'q' | 'a'>>): Promise<string | null> {
  const { error } = await supabase.from('faq_items').update(patch).eq('id', id)
  return error ? error.message : null
}
export async function deleteFaqItem(id: string): Promise<string | null> {
  const { error } = await supabase.from('faq_items').delete().eq('id', id)
  return error ? error.message : null
}
