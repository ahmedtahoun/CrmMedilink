import { useMemo, useState } from 'react'
import type { Profile } from '../lib/types'
import type { Clinic } from '../lib/types'
import { CLOSER_STAGES, DEACTIVATION_REASONS, TRAINER_STAGES } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import {
  useClinics,
  useClinicDetail,
  updateClinic,
  addComment,
  addSession,
  updateSession,
  addTask,
  toggleTask,
} from '../lib/clinics'
import { catStyle, priStyle, stageColorFor } from '../lib/styles'
import { shortDay } from '../lib/format'
import { riskFlags, stageTitle, type BoardType } from '../lib/pipeline'
import Avatar from '../components/Avatar'
import Pill from '../components/Pill'

interface Props {
  clinicId: string
  profile: Profile
  board: BoardType
  onClose: () => void
}

type Tab = 'overview' | 'training' | 'tasks' | 'files'

// stage -> {label for the button, next stage key}
const CLOSER_NEXT: Record<string, { label: string; next: string }> = {
  lead: { label: 'Log Follow-up', next: 'followup' },
  followup: { label: 'Send Proposal', next: 'proposal' },
  proposal: { label: 'Mark Commission Based', next: 'commission' },
  commission: { label: 'Mark Contract Signed', next: 'signed' },
}
const TRAINER_NEXT: Record<string, { label: string; next: string }> = {
  handoff: { label: 'Schedule Training', next: 'scheduled' },
  scheduled: { label: 'Start Reception Training', next: 'reception' },
  reception: { label: 'Start Follow-up', next: 'followup' },
  followup: { label: 'Mark Live', next: 'live' },
}

export default function ClinicDetailModal({ clinicId, profile, board, onClose }: Props) {
  const market = useAppStore((s) => s.market)
  const showToast = useAppStore((s) => s.showToast)
  const { clinics } = useClinics(market)
  const clinic = clinics.find((c) => c.id === clinicId)
  const { comments, sessions, tasks, reload } = useClinicDetail(clinicId)

  const [tab, setTab] = useState<Tab>('overview')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentType, setCommentType] = useState('Note')
  const [deactivating, setDeactivating] = useState(false)
  const [reason, setReason] = useState('')
  const [taskDraft, setTaskDraft] = useState('')
  const [session, setSession] = useState({ type: 'Reception Training', date: '', time: '', trainer: '', notes: '' })

  const canManageSub = profile.role === 'CEO' || profile.role === 'Admin'
  const isTrainerView = board === 'trainer'

  const flags = useMemo(() => (clinic ? riskFlags(clinic) : []), [clinic])

  if (!clinic) {
    return (
      <div className="ml-overlay" onClick={onClose}>
        <div className="ml-modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
          <div className="ml-empty">Clinic not found.</div>
        </div>
      </div>
    )
  }

  const stKey = board === 'closer' ? clinic.cs : clinic.ts ?? 'handoff'
  const next = (board === 'closer' ? CLOSER_NEXT : TRAINER_NEXT)[stKey]
  const journeyStages = board === 'closer' ? CLOSER_STAGES : TRAINER_STAGES
  const journeyIdx = journeyStages.findIndex((s) => s.key === stKey)
  const journeyPct = Math.round(((journeyIdx + 1) / journeyStages.length) * 100)
  const stColor = stageColorFor(clinic.cs, clinic.ts)
  const reachedMou = clinic.cs === 'signed' || clinic.cs === 'commission'

  async function patch(p: Partial<Clinic>, msg?: string) {
    const err = await updateClinic(clinicId, p)
    if (err) showToast(err)
    else if (msg) showToast(msg)
  }

  async function runPrimary() {
    if (!next) return
    if (board === 'closer') await patch({ cs: next.next as Clinic['cs'] }, `Moved to ${stageTitle('closer', next.next)}`)
    else await patch({ ts: next.next as Clinic['ts'] }, `Moved to ${stageTitle('trainer', next.next)}`)
  }

  async function postComment() {
    if (!commentDraft.trim()) return
    const err = await addComment(clinicId, profile.name, profile.id, commentDraft.trim(), commentType)
    if (err) return showToast(err)
    setCommentDraft('')
    reload()
  }

  async function confirmDeactivate() {
    const err = await updateClinic(clinicId, { sub_status: 'inactive', sub_reason: reason })
    if (err) return showToast(err)
    setDeactivating(false)
    showToast('Subscription deactivated')
  }

  async function saveSession() {
    if (!session.date) return showToast('Pick a date')
    const err = await addSession({ clinic_id: clinicId, ...session, status: 'Scheduled' })
    if (err) return showToast(err)
    setSession({ type: 'Reception Training', date: '', time: '', trainer: '', notes: '' })
    reload()
    showToast('Training session scheduled')
  }

  async function saveTask() {
    if (!taskDraft.trim()) return
    const err = await addTask(clinicId, taskDraft.trim(), profile.name, null)
    if (err) return showToast(err)
    setTaskDraft('')
    reload()
  }

  const detailTabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'training', label: 'Training' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'files', label: 'Files' },
  ]

  return (
    <div
      className="ml-overlay"
      onClick={onClose}
      style={{ position: 'fixed', animation: 'fadeIn .18s ease' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92%',
          maxHeight: '92%',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 20,
          animation: 'popIn .22s ease',
        }}
      >
        {/* header */}
        <div
          style={{
            padding: '26px 30px',
            background: 'linear-gradient(135deg,#0c1920,#123028)',
            color: '#fff',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 22, margin: '0 0 10px' }}>
                {clinic.name}
              </h2>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <Pill swatch={catStyle(clinic.cat)}>{clinic.cat}</Pill>
                <select
                  value={clinic.pri}
                  onChange={(e) => patch({ pri: e.target.value as Clinic['pri'] })}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: priStyle(clinic.pri).bg,
                    color: priStyle(clinic.pri).color,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="High">High priority</option>
                  <option value="Medium">Medium priority</option>
                  <option value="Low">Low priority</option>
                </select>
              </div>
            </div>
            <div
              onClick={onClose}
              style={{ cursor: 'pointer', color: '#8fb3ab', fontSize: 22, lineHeight: 1, padding: '2px 6px' }}
            >
              ×
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 30px' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--tab-track-2)', padding: 4, borderRadius: 11, marginBottom: 20 }}>
            {detailTabs.map((t) => (
              <div
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  background: tab === t.key ? '#fff' : 'transparent',
                  color: tab === t.key ? 'var(--ink)' : 'var(--muted-3)',
                }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              {flags.length > 0 && (
                <div style={{ background: '#fdecec', border: '1px solid #f3caca', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                    ⚠ Needs Attention
                  </div>
                  {flags.map((f) => (
                    <div key={f.label} style={{ fontSize: 12.5, color: '#8a2b2b', fontWeight: 600, padding: '2px 0' }}>
                      {f.label}
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 18,
                  background: '#f7f9fa',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div>
                  <div style={labelSm}>Current Stage</div>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 800,
                      padding: '4px 11px',
                      borderRadius: 20,
                      background: stColor.bg,
                      color: stColor.color,
                    }}
                  >
                    {stageTitle(board, stKey)}
                  </span>
                </div>
                {next && (
                  <button className="ml-btn" onClick={runPrimary} style={{ fontSize: 13 }}>
                    {next.label}
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 22px', marginBottom: 22 }}>
                <Field label="Contact" value={clinic.contact} />
                <Field label="Phone" value={clinic.phone} />
                <Field label="Area" value={clinic.area} />
                <div>
                  <div style={labelSm}>Closer / Trainer</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {clinic.closer && <Avatar name={clinic.closer} size={22} />}
                    {clinic.trainer && <Avatar name={clinic.trainer} size={22} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                      {[clinic.closer, clinic.trainer].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ ...labelSm, marginBottom: 10 }}>Sales journey</div>
                <div style={{ height: 8, background: '#eef1f3', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${journeyPct}%`, background: 'linear-gradient(90deg,#17c08f,#0e9270)', borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)' }}>
                  Current: {stageTitle(board, stKey)}
                </div>
              </div>

              {reachedMou && !isTrainerView && (
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 13, padding: '16px 18px', marginBottom: 22 }}>
                  <div style={{ ...labelSm, marginBottom: 12 }}>Trial &amp; subscription</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 22px', marginBottom: 16 }}>
                    <DateField label="Trial Start" value={clinic.trial_from} onChange={(v) => patch({ trial_from: v })} />
                    <DateField label="Trial End" value={clinic.trial_to} onChange={(v) => patch({ trial_to: v })} />
                    <DateField label="Subscription Start" value={clinic.sub_from} onChange={(v) => patch({ sub_from: v })} />
                    <DateField label="Subscription End" value={clinic.sub_to} onChange={(v) => patch({ sub_to: v })} />
                  </div>

                  {clinic.sub_status !== 'inactive' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <Pill swatch={{ color: '#0e9b76', bg: '#e3f4ee' }}>● Active</Pill>
                      {canManageSub ? (
                        !deactivating ? (
                          <div
                            onClick={() => setDeactivating(true)}
                            style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626', cursor: 'pointer', padding: '8px 14px', borderRadius: 9, border: '1px solid #f3caca' }}
                          >
                            Deactivate
                          </div>
                        ) : null
                      ) : (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--empty)' }}>CEO only</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <Pill swatch={{ color: '#dc2626', bg: '#fdecec' }}>● Deactivated</Pill>
                        {canManageSub && (
                          <div
                            onClick={() => patch({ sub_status: 'active', sub_reason: '' }, 'Reactivated')}
                            style={{ fontSize: 12.5, fontWeight: 700, color: '#0e9b76', cursor: 'pointer', padding: '8px 14px', borderRadius: 9, border: '1px solid #bfe4d5' }}
                          >
                            Reactivate
                          </div>
                        )}
                      </div>
                      {clinic.sub_reason && (
                        <>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--empty)', marginBottom: 4 }}>
                            Reason clinic didn't subscribe
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.5 }}>
                            {clinic.sub_reason}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {deactivating && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #eef1f3' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--empty)', marginBottom: 7 }}>
                        Reason the clinic isn't subscribing
                      </div>
                      <select
                        className="ml-select"
                        value={DEACTIVATION_REASONS.includes(reason) ? reason : ''}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ marginBottom: 8 }}
                      >
                        <option value="">Choose a reason…</option>
                        {DEACTIVATION_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="ml-textarea"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Add detail…"
                        rows={2}
                        style={{ marginBottom: 10 }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <div onClick={() => setDeactivating(false)} style={{ padding: '9px 16px', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'var(--muted-2)', background: 'var(--tab-track-2)' }}>
                          Cancel
                        </div>
                        <div onClick={confirmDeactivate} style={{ padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#fff', background: '#dc2626' }}>
                          Confirm deactivate
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Activity + comments */}
              <div>
                <div style={{ ...labelSm, marginBottom: 10 }}>Activity</div>
                <div style={{ maxHeight: 190, overflow: 'auto', marginBottom: 10 }}>
                  {comments.length === 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--empty)', fontWeight: 600, padding: '6px 0' }}>
                      No comments yet.
                    </div>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600, padding: '5px 0 5px 14px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: 9, width: 5, height: 5, borderRadius: '50%', background: '#0e9b76' }} />
                      <strong>{c.author}</strong> · {shortDay(c.created_at)} — {c.text}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                  {['Note', 'Call', 'Visit'].map((t) => (
                    <div
                      key={t}
                      onClick={() => setCommentType(t)}
                      style={{
                        padding: '6px 11px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 11.5,
                        cursor: 'pointer',
                        background: commentType === t ? '#e3f4ee' : '#f1f4f6',
                        color: commentType === t ? '#0e6b52' : 'var(--muted-2)',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    className="ml-input"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && postComment()}
                    placeholder="Write a comment…"
                  />
                  <button className="ml-btn" onClick={postComment} style={{ flexShrink: 0 }}>
                    Post
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'training' && (
            <div>
              {sessions.length === 0 && <div className="ml-empty" style={{ padding: '18px 0' }}>No training sessions yet.</div>}
              {sessions.map((s) => (
                <div key={s.id} style={{ border: '1px solid var(--border-2)', borderRadius: 11, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{s.type}</strong>
                    <select
                      value={s.status}
                      onChange={async (e) => {
                        await updateSession(s.id, { status: e.target.value as never })
                        reload()
                      }}
                      className="ml-select"
                      style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
                    >
                      <option>Scheduled</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {shortDay(s.date)} {s.time} · {s.trainer || 'Unassigned'}
                  </div>
                  {s.notes && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 6 }}>{s.notes}</div>}
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 12, paddingTop: 14 }}>
                <div style={{ ...labelSm, marginBottom: 10 }}>Schedule a session</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <select className="ml-select" value={session.type} onChange={(e) => setSession({ ...session, type: e.target.value })}>
                    <option>Reception Training</option>
                    <option>Doctor Training</option>
                    <option>Admin Training</option>
                    <option>Follow-up</option>
                  </select>
                  <input className="ml-input" placeholder="Trainer" value={session.trainer} onChange={(e) => setSession({ ...session, trainer: e.target.value })} />
                  <input className="ml-input" type="date" value={session.date} onChange={(e) => setSession({ ...session, date: e.target.value })} />
                  <input className="ml-input" type="time" value={session.time} onChange={(e) => setSession({ ...session, time: e.target.value })} />
                </div>
                <textarea className="ml-textarea" rows={2} placeholder="Notes" value={session.notes} onChange={(e) => setSession({ ...session, notes: e.target.value })} style={{ marginBottom: 10 }} />
                <button className="ml-btn" onClick={saveSession}>Schedule session</button>
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div>
              {tasks.length === 0 && <div className="ml-empty" style={{ padding: '18px 0' }}>No tasks yet.</div>}
              {tasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={async () => {
                      await toggleTask(t.id, !t.done)
                      reload()
                    }}
                    style={{ width: 15, height: 15 }}
                  />
                  <span style={{ flex: 1, fontSize: 13.5, color: t.done ? 'var(--empty)' : 'var(--ink-2)', textDecoration: t.done ? 'line-through' : 'none' }}>
                    {t.title}
                  </span>
                  {t.owner && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.owner}</span>}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <input
                  className="ml-input"
                  value={taskDraft}
                  onChange={(e) => setTaskDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTask()}
                  placeholder="Add a task…"
                />
                <button className="ml-btn" onClick={saveTask} style={{ flexShrink: 0 }}>Add</button>
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div className="ml-empty" style={{ padding: '24px 0' }}>
              File attachments land alongside the Documents workspace in Phase 3.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelSm: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: '#93a1aa',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={labelSm}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', marginTop: 4 }}>{value || '—'}</div>
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ ...labelSm, display: 'block', marginBottom: 5 }}>{label}</label>
      <input className="ml-input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
