import { useMemo, useState } from 'react'
import type { CalendarEvent, Clinic } from '../lib/types'
import { CAL_EVENT_TYPES, CAL_PRIORITIES, type MarketKey } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useCalendarEvents, saveCalendarEvent, deleteCalendarEvent, toggleCalendarEventDone } from '../lib/calendar'
import { useClinics } from '../lib/clinics'
import { eventTypeStyle, eventPriorityStyle } from '../lib/styles'
import { localDateStr } from '../lib/format'
import Icon from '../components/Icon'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface DraftState {
  id?: string
  title: string
  type: string
  priority: string
  clinic_id: string
  date: string
  time: string
  notes: string
  done: boolean
}

const blankDraft = (date: string): DraftState => ({
  title: '',
  type: 'Task',
  priority: 'Medium',
  clinic_id: '',
  date,
  time: '',
  notes: '',
  done: false,
})

export default function Calendar() {
  const market = useAppStore((s) => s.market)
  const showToast = useAppStore((s) => s.showToast)
  const calCursor = useAppStore((s) => s.calCursor)
  const setCalCursor = useAppStore((s) => s.setCalCursor)
  const calView = useAppStore((s) => s.calView)
  const setCalView = useAppStore((s) => s.setCalView)
  const calSelectedDate = useAppStore((s) => s.calSelectedDate)
  const setCalSelectedDate = useAppStore((s) => s.setCalSelectedDate)

  const { events, reload } = useCalendarEvents(market)
  const { clinics } = useClinics(market)
  const clinicName = (id: string | null) => clinics.find((c) => c.id === id)?.name ?? ''

  const [modal, setModal] = useState<DraftState | null>(null)

  const [cy, cm] = calCursor.split('-').map(Number)

  function shiftMonth(n: number) {
    const d = new Date(cy, cm - 1 + n, 1)
    setCalCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function shiftDay(n: number) {
    const d = new Date(calSelectedDate + 'T00:00:00')
    d.setDate(d.getDate() + n)
    setCalSelectedDate(localDateStr(d))
    setCalCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function shiftWeek(n: number) {
    shiftDay(n * 7)
  }
  function goToday() {
    const d = new Date()
    setCalCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setCalSelectedDate(localDateStr(d))
  }

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const arr = m.get(e.date) ?? []
      arr.push(e)
      m.set(e.date, arr)
    }
    return m
  }, [events])

  async function save() {
    if (!modal) return
    if (!modal.title.trim()) return showToast('Add a title')
    if (!modal.date) return showToast('Pick a date')
    const err = await saveCalendarEvent({
      id: modal.id,
      title: modal.title.trim(),
      type: modal.type as CalendarEvent['type'],
      priority: modal.priority as CalendarEvent['priority'],
      clinic_id: modal.clinic_id || null,
      date: modal.date,
      time: modal.time || null,
      notes: modal.notes || null,
      done: modal.done,
      market: market as MarketKey,
      owner: 'trainer',
    })
    if (err) return showToast(err)
    setModal(null)
    reload()
    showToast('Saved to calendar')
  }

  const today = localDateStr(new Date())

  // month grid cells
  const monthCells = useMemo(() => {
    const first = new Date(cy, cm - 1, 1)
    const daysInMonth = new Date(cy, cm, 0).getDate()
    const lead = first.getDay()
    const cells: ({ date: string; day: number } | null)[] = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: `${cy}-${String(cm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d })
    }
    return cells
  }, [cy, cm])

  const weekDays = useMemo(() => {
    const d = new Date(calSelectedDate + 'T00:00:00')
    d.setDate(d.getDate() - d.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d)
      x.setDate(d.getDate() + i)
      return localDateStr(x)
    })
  }, [calSelectedDate])

  const dayEvents = (eventsByDate.get(calSelectedDate) ?? []).slice().sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 26px 24px' }}>
      <div className="ml-card" style={{ padding: '20px 22px', animation: 'fadeIn .3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 17, margin: 0, color: 'var(--ink-2)' }}>
            {calView === 'month' && `${MONTH_NAMES[cm - 1]} ${cy}`}
            {calView === 'week' && `Week of ${weekDays[0]}`}
            {calView === 'day' && new Date(calSelectedDate + 'T00:00:00').toDateString()}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 3, background: '#0c1920', padding: 4, borderRadius: 11 }}>
              {(['day', 'week', 'month'] as const).map((v) => (
                <div
                  key={v}
                  onClick={() => setCalView(v)}
                  style={{
                    padding: '7px 13px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    background: calView === v ? '#fff' : 'transparent',
                    color: calView === v ? '#0c1920' : '#8fb3ab',
                  }}
                >
                  {v}
                </div>
              ))}
            </div>
            <button className="ml-btn ml-btn--ghost" onClick={goToday} style={{ padding: '8px 13px', fontSize: 12.5 }}>
              Today
            </button>
            <button
              className="ml-btn ml-btn--ghost"
              onClick={() => (calView === 'month' ? shiftMonth(-1) : calView === 'week' ? shiftWeek(-1) : shiftDay(-1))}
              style={{ padding: 8, width: 34 }}
            >
              <Icon name="chevronLeft" size={15} />
            </button>
            <button
              className="ml-btn ml-btn--ghost"
              onClick={() => (calView === 'month' ? shiftMonth(1) : calView === 'week' ? shiftWeek(1) : shiftDay(1))}
              style={{ padding: 8, width: 34 }}
            >
              <Icon name="chevronRight" size={15} />
            </button>
            <button className="ml-btn" onClick={() => setModal(blankDraft(calSelectedDate))} style={{ padding: '8px 13px', fontSize: 12.5 }}>
              <Icon name="plus" size={13} strokeWidth={2.8} />
              Add
            </button>
          </div>
        </div>

        {calView === 'month' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 8 }}>
              {WD.map((w) => (
                <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#96a3ab', padding: '4px 0' }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
              {monthCells.map((cell, i) =>
                !cell ? (
                  <div key={`b${i}`} />
                ) : (
                  <div
                    key={cell.date}
                    onClick={() => {
                      setCalSelectedDate(cell.date)
                      setCalView('day')
                    }}
                    style={{
                      minHeight: 96,
                      border: `1.5px solid ${cell.date === today ? 'var(--brand)' : '#eef1f3'}`,
                      borderRadius: 11,
                      padding: 7,
                      background: '#fbfcfc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)' }}>{cell.day}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          setModal(blankDraft(cell.date))
                        }}
                        style={{ width: 16, height: 16, borderRadius: 5, background: '#eef1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#647680', fontSize: 12 }}
                      >
                        +
                      </span>
                    </div>
                    {(eventsByDate.get(cell.date) ?? []).slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModal({ ...ev, clinic_id: ev.clinic_id ?? '', time: ev.time ?? '', notes: ev.notes ?? '' })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#fff',
                          border: '1px solid #e6ebee',
                          borderLeft: `3px solid ${eventTypeStyle(ev.type)}`,
                          borderRadius: 7,
                          padding: '3px 6px',
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev.title}
                        </span>
                      </div>
                    ))}
                    {(eventsByDate.get(cell.date)?.length ?? 0) > 3 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8895a0' }}>+{(eventsByDate.get(cell.date)?.length ?? 0) - 3} more</span>
                    )}
                  </div>
                ),
              )}
            </div>
          </>
        )}

        {calView === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
            {weekDays.map((d) => (
              <div key={d} style={{ border: `1.5px solid ${d === today ? 'var(--brand)' : '#eef1f3'}`, borderRadius: 11, padding: 8, background: '#fbfcfc', minHeight: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#96a3ab' }}>{WD[new Date(d + 'T00:00:00').getDay()]}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-2)', cursor: 'pointer' }} onClick={() => { setCalSelectedDate(d); setCalView('day') }}>
                      {new Date(d + 'T00:00:00').getDate()}
                    </div>
                  </div>
                  <span onClick={() => setModal(blankDraft(d))} style={{ width: 18, height: 18, borderRadius: 5, background: '#eef1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#647680', fontSize: 13, cursor: 'pointer' }}>
                    +
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
                  {(eventsByDate.get(d) ?? []).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setModal({ ...ev, clinic_id: ev.clinic_id ?? '', time: ev.time ?? '', notes: ev.notes ?? '' })}
                      style={{ display: 'flex', gap: 5, background: '#fff', border: '1px solid #e6ebee', borderLeft: `3px solid ${eventTypeStyle(ev.type)}`, borderRadius: 7, padding: '4px 6px', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {calView === 'day' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayEvents.length === 0 && (
              <div className="ml-empty">Nothing scheduled. Click Add to create a task, meeting, follow-up or reminder.</div>
            )}
            {dayEvents.map((ev) => (
              <div
                key={ev.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fbfcfc', border: '1px solid #e6ebee', borderRadius: 11, padding: '11px 14px', opacity: ev.done ? 0.65 : 1 }}
              >
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: eventTypeStyle(ev.type), flexShrink: 0 }} />
                <div style={{ minWidth: 56, fontSize: 12, fontWeight: 700, color: '#8895a0' }}>{ev.time || '—'}</div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setModal({ ...ev, clinic_id: ev.clinic_id ?? '', time: ev.time ?? '', notes: ev.notes ?? '' })}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)', textDecoration: ev.done ? 'line-through' : 'none' }}>{ev.title}</div>
                  <div style={{ fontSize: 11.5, color: '#8895a0', fontWeight: 600 }}>
                    {ev.type}
                    {ev.clinic_id ? ` · ${clinicName(ev.clinic_id)}` : ''}
                  </div>
                </div>
                <div
                  onClick={async () => {
                    await toggleCalendarEventDone(ev.id, !ev.done)
                    reload()
                  }}
                  style={{ fontSize: 11, fontWeight: 700, color: '#0e9b76', cursor: 'pointer', padding: '5px 9px', borderRadius: 7, background: '#eef4f2' }}
                >
                  {ev.done ? 'Reopen' : 'Done'}
                </div>
                <div
                  onClick={async () => {
                    await deleteCalendarEvent(ev.id)
                    reload()
                  }}
                  style={{ cursor: 'pointer', color: '#dc2626', fontSize: 11, fontWeight: 700 }}
                >
                  Remove
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <EventModal
          draft={modal}
          setDraft={setModal}
          clinics={clinics}
          onSave={save}
          onClose={() => setModal(null)}
          onDelete={
            modal.id
              ? async () => {
                  await deleteCalendarEvent(modal.id!)
                  setModal(null)
                  reload()
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function EventModal({
  draft,
  setDraft,
  clinics,
  onSave,
  onClose,
  onDelete,
}: {
  draft: DraftState
  setDraft: (d: DraftState) => void
  clinics: Clinic[]
  onSave: () => void
  onClose: () => void
  onDelete?: () => void
}) {
  const up = (patch: Partial<DraftState>) => setDraft({ ...draft, ...patch })
  return (
    <div className="ml-overlay" style={{ position: 'fixed' }} onClick={onClose}>
      <div className="ml-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, margin: '0 0 16px', color: 'var(--ink-2)' }}>
          {draft.id ? 'Edit event' : 'New event'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="ml-label">Title</label>
            <input className="ml-input" value={draft.title} onChange={(e) => up({ title: e.target.value })} placeholder="e.g. Follow up with Dr. Sami" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="ml-label">Time</label>
              <input className="ml-input" type="time" value={draft.time} onChange={(e) => up({ time: e.target.value })} />
            </div>
            <div>
              <label className="ml-label">Date</label>
              <input className="ml-input" type="date" value={draft.date} onChange={(e) => up({ date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="ml-label">Type</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {CAL_EVENT_TYPES.map((t) => (
                <div
                  key={t}
                  onClick={() => up({ type: t })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    background: draft.type === t ? '#eef4f2' : '#f1f4f6',
                    color: draft.type === t ? '#0e6b52' : 'var(--muted-2)',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: eventTypeStyle(t) }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="ml-label">Priority</label>
            <div style={{ display: 'flex', gap: 7 }}>
              {CAL_PRIORITIES.map((p) => (
                <div
                  key={p}
                  onClick={() => up({ priority: p })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    background: draft.priority === p ? '#eef4f2' : '#f1f4f6',
                    color: draft.priority === p ? '#0e6b52' : 'var(--muted-2)',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: eventPriorityStyle(p) }} />
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="ml-label">Link to clinic (optional)</label>
            <select className="ml-select" value={draft.clinic_id} onChange={(e) => up({ clinic_id: e.target.value })}>
              <option value="">No link</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Notes / outcome</label>
            <textarea className="ml-textarea" rows={2} value={draft.notes} onChange={(e) => up({ notes: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          {onDelete ? (
            <div onClick={onDelete} style={{ color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Delete
            </div>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <div onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', background: '#f1f4f6', color: 'var(--text)' }}>
              Cancel
            </div>
            <button className="ml-btn" onClick={onSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
