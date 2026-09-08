import { useState } from 'react'
import type { Profile } from '../lib/types'
import { useAppStore } from '../store/appStore'
import {
  useFaq,
  addFaqCategory,
  addFaqItem,
  deleteFaqCategory,
  deleteFaqItem,
  renameFaqCategory,
  updateFaqItem,
} from '../lib/faq'
import Icon from '../components/Icon'

interface Props {
  profile: Profile
}

export default function Faq({ profile }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const ceoPersona = useAppStore((s) => s.ceoPersona)
  const canEdit = (profile.role === 'CEO' || profile.role === 'Admin') && ceoPersona
  const { categories, items, loading, reload } = useFaq()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState<{ catId: string; q: string; a: string } | null>(null)

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  async function guard(p: Promise<string | null>, ok: string) {
    const err = await p
    if (err) showToast(err)
    else {
      showToast(ok)
      reload()
    }
  }

  return (
    <>
      <div style={{ padding: '20px 26px 0', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 23, letterSpacing: '-.6px', margin: '0 0 4px', color: 'var(--ink)' }}>
            FAQ
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted-4)', fontWeight: 600 }}>Answers for company, sales &amp; implementation questions</div>
        </div>
        {canEdit && (
          <button
            className="ml-btn ml-btn--ghost"
            onClick={() => guard(addFaqCategory('New category', categories.length), 'Category added')}
            style={{ flexShrink: 0 }}
          >
            <Icon name="plus" size={14} strokeWidth={2.6} />
            Add category
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 26px 24px' }}>
        {loading && <div className="ml-empty">Loading…</div>}
        {!loading && categories.length === 0 && <div className="ml-empty">No FAQ entries yet.</div>}

        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id)
          return (
            <div key={cat.id} className="ml-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
                {canEdit ? (
                  <input
                    defaultValue={cat.name}
                    onBlur={(e) => e.target.value !== cat.name && guard(renameFaqCategory(cat.id, e.target.value), 'Renamed')}
                    style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', border: '1px solid transparent', borderRadius: 8, padding: '4px 7px', outline: 'none', background: 'transparent' }}
                  />
                ) : (
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{cat.name}</div>
                )}
                {canEdit && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span
                      onClick={() => setDraft({ catId: cat.id, q: '', a: '' })}
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', cursor: 'pointer' }}
                    >
                      + Question
                    </span>
                    <span
                      onClick={() => confirm(`Delete "${cat.name}" and its questions?`) && guard(deleteFaqCategory(cat.id), 'Deleted')}
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      Delete
                    </span>
                  </div>
                )}
              </div>

              {catItems.map((it) => (
                <div key={it.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <div
                    onClick={() => toggle(it.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 0', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)' }}>{it.q}</span>
                    <Icon name="chevronDown" size={16} style={{ transform: open.has(it.id) ? 'rotate(180deg)' : 'none', transition: 'transform .15s', color: 'var(--muted-4)' }} />
                  </div>
                  {open.has(it.id) && (
                    <div style={{ paddingBottom: 14 }}>
                      {canEdit ? (
                        <textarea
                          className="ml-textarea"
                          defaultValue={it.a}
                          rows={3}
                          onBlur={(e) => e.target.value !== it.a && guard(updateFaqItem(it.id, { a: e.target.value }), 'Saved')}
                        />
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{it.a}</div>
                      )}
                      {canEdit && (
                        <span
                          onClick={() => guard(deleteFaqItem(it.id), 'Question deleted')}
                          style={{ display: 'inline-block', marginTop: 8, fontSize: 11.5, fontWeight: 700, color: 'var(--danger)', cursor: 'pointer' }}
                        >
                          Delete question
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {draft?.catId === cat.id && (
                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
                  <input className="ml-input" placeholder="Question" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} style={{ marginBottom: 8 }} />
                  <textarea className="ml-textarea" placeholder="Answer" rows={3} value={draft.a} onChange={(e) => setDraft({ ...draft, a: e.target.value })} style={{ marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="ml-btn"
                      onClick={async () => {
                        if (!draft.q.trim()) return showToast('Add a question')
                        await guard(addFaqItem(cat.id, draft.q.trim(), draft.a.trim(), catItems.length), 'Question added')
                        setDraft(null)
                      }}
                      style={{ padding: '8px 14px', fontSize: 12.5 }}
                    >
                      Add
                    </button>
                    <button className="ml-btn ml-btn--ghost" onClick={() => setDraft(null)} style={{ padding: '8px 14px', fontSize: 12.5 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
