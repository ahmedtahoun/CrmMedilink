import { useRef } from 'react'
import type { Profile } from '../lib/types'
import { COUNTRY_OPTIONS } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import {
  useCountryDocuments,
  uploadCountryDocument,
  downloadCountryDocument,
  deleteCountryDocument,
} from '../lib/documents'
import { shortDay } from '../lib/format'

interface Props {
  profile: Profile
}

export default function Documents({ profile }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const { docs, loading, reload } = useCountryDocuments()
  const canManage = profile.role === 'CEO' || profile.role === 'Admin'
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  async function onPick(country: string, file: File | undefined) {
    if (!file) return
    const err = await uploadCountryDocument(country, file, profile.id)
    if (err) showToast(err)
    else {
      showToast('File uploaded')
      reload()
    }
  }

  async function open(docId: string) {
    const doc = docs.find((d) => d.id === docId)!
    const url = await downloadCountryDocument(doc)
    if (url) window.open(url, '_blank', 'noopener')
    else showToast('Could not open file')
  }

  return (
    <>
      <div style={{ padding: '20px 26px 0', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 23, letterSpacing: '-.6px', margin: '0 0 4px', color: 'var(--ink)' }}>
          Documents
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted-4)', fontWeight: 600 }}>
          Shared files by country{canManage ? ' · upload and manage below' : ''}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 26px 24px' }}>
        {loading && <div className="ml-empty">Loading…</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {COUNTRY_OPTIONS.map((country) => {
            const group = docs.filter((d) => d.country === country)
            return (
              <div key={country} className="ml-card" style={{ borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{country}</div>
                  {canManage && (
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--brand)',
                        background: 'var(--brand-tint)',
                        border: '1px solid var(--brand-tint-border)',
                        padding: '6px 11px',
                        borderRadius: 9,
                        cursor: 'pointer',
                      }}
                    >
                      Upload
                      <input
                        ref={(el) => {
                          inputs.current[country] = el
                        }}
                        type="file"
                        onChange={(e) => onPick(country, e.target.files?.[0])}
                        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                      />
                    </label>
                  )}
                </div>
                {group.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--empty)', padding: '8px 0 2px' }}>No documents uploaded yet</div>
                ) : (
                  group.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '8px 0',
                        borderTop: '1px solid var(--border-soft)',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--empty)' }}>Updated {shortDay(doc.uploaded_at)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => open(doc.id)}
                          style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 700, background: '#f1f4f6', color: 'var(--text)', border: 'none', cursor: 'pointer' }}
                        >
                          Open
                        </button>
                        {canManage && (
                          <button
                            onClick={async () => {
                              const err = await deleteCountryDocument(doc)
                              if (err) showToast(err)
                              else {
                                showToast('Deleted')
                                reload()
                              }
                            }}
                            style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 700, background: '#fdf1f1', color: '#dc2626', border: '1px solid #f6d8d8', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
