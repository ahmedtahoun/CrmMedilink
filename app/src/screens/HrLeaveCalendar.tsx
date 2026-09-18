import { useMemo, useState } from 'react'
import { useIsMobile } from '../lib/useIsMobile'
import type { EmployeeLeave, PublicHoliday } from '../lib/types'
import { COUNTRY_OPTIONS } from '../lib/constants'
import { useEmployees } from '../lib/employees'
import { useEmployeeLeaves, useHolidays, leaveDateRange, leaveDays } from '../lib/leaves'
import { initials, repColor, leaveTypeStyle, HOLIDAY_SWATCH } from '../lib/styles'
import { currentMonthCursor, localDateStr, shortDay } from '../lib/format'
import Icon from '../components/Icon'
import Pill from '../components/Pill'
import LeaveModal from '../modals/LeaveModal'
import HolidayModal from '../modals/HolidayModal'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function HrLeaveCalendar() {
  const isMobile = useIsMobile()
  const { employees } = useEmployees()
  const { leaves, reload: reloadLeaves } = useEmployeeLeaves()
  const { holidays, reload: reloadHolidays } = useHolidays()

  const [cursor, setCursor] = useState(currentMonthCursor())
  const [empF, setEmpF] = useState('all')
  const [countryF, setCountryF] = useState('all')
  const [leaveModal, setLeaveModal] = useState<{ editing: EmployeeLeave | null; date?: string } | null>(null)
  const [holidayModal, setHolidayModal] = useState<{ editing: PublicHoliday | null; date?: string } | null>(null)

  const [cy, cm] = cursor.split('-').map(Number)
  const shiftMonth = (n: number) => {
    const d = new Date(cy, cm - 1 + n, 1)
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? 'Unknown'

  const filteredLeaves = useMemo(
    () => (empF === 'all' ? leaves : leaves.filter((l) => l.employee_id === empF)),
    [leaves, empF],
  )
  const filteredHolidays = useMemo(
    () => (countryF === 'all' ? holidays : holidays.filter((h) => h.country === countryF)),
    [holidays, countryF],
  )

  const leavesByDate = useMemo(() => {
    const m = new Map<string, EmployeeLeave[]>()
    for (const l of filteredLeaves) {
      for (const d of leaveDateRange(l.start_date, l.end_date)) {
        const arr = m.get(d) ?? []
        arr.push(l)
        m.set(d, arr)
      }
    }
    return m
  }, [filteredLeaves])

  const holidaysByDate = useMemo(() => {
    const m = new Map<string, PublicHoliday[]>()
    for (const h of filteredHolidays) {
      const arr = m.get(h.date) ?? []
      arr.push(h)
      m.set(h.date, arr)
    }
    return m
  }, [filteredHolidays])

  const today = localDateStr(new Date())

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

  const onLeaveToday = leavesByDate.get(today)?.length ?? 0
  const monthLeaveDays = useMemo(() => {
    let total = 0
    for (const [d, arr] of leavesByDate) {
      if (d.startsWith(cursor)) total += arr.length
    }
    return total
  }, [leavesByDate, cursor])
  const upcomingHolidays = useMemo(
    () => filteredHolidays.filter((h) => h.date >= today).slice(0, 5),
    [filteredHolidays, today],
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 12px 20px' : '0 26px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="On leave today" value={onLeaveToday} />
        <StatCard label={`Leave days · ${MONTH_NAMES[cm - 1]}`} value={monthLeaveDays} accent="var(--brand)" />
        <StatCard label="Employees tracked" value={employees.length} />
      </div>

      <div className="ml-card" style={{ padding: isMobile ? '14px 14px' : '20px 22px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: isMobile ? 15 : 17, margin: 0, color: 'var(--ink-2)' }}>
            {MONTH_NAMES[cm - 1]} {cy}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select className="ml-select" value={empF} onChange={(e) => setEmpF(e.target.value)} style={{ borderRadius: 11, fontWeight: 600, fontSize: 12.5 }}>
              <option value="all">All employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <button className="ml-btn ml-btn--ghost" onClick={() => setCursor(currentMonthCursor())} style={{ padding: '8px 13px', fontSize: 12.5 }}>
              Today
            </button>
            <button className="ml-btn ml-btn--ghost" onClick={() => shiftMonth(-1)} style={{ padding: 8, width: 34 }}>
              <Icon name="chevronLeft" size={15} />
            </button>
            <button className="ml-btn ml-btn--ghost" onClick={() => shiftMonth(1)} style={{ padding: 8, width: 34 }}>
              <Icon name="chevronRight" size={15} />
            </button>
            <button className="ml-btn" onClick={() => setLeaveModal({ editing: null, date: today })} style={{ padding: '8px 13px', fontSize: 12.5 }}>
              <Icon name="plus" size={13} strokeWidth={2.8} />
              Log leave
            </button>
          </div>
        </div>

        <div style={{ overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: isMobile ? 680 : undefined }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 8 }}>
              {WD.map((w) => (
                <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#96a3ab', padding: '4px 0' }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
              {monthCells.map((cell, i) => {
                if (!cell) return <div key={`b${i}`} />
                const dayLeaves = leavesByDate.get(cell.date) ?? []
                const dayHolidays = holidaysByDate.get(cell.date) ?? []
                return (
                  <div
                    key={cell.date}
                    onClick={() => setLeaveModal({ editing: null, date: cell.date })}
                    style={{
                      minHeight: isMobile ? 82 : 100,
                      border: `1.5px solid ${cell.date === today ? 'var(--brand)' : dayHolidays.length ? '#f0cd8e' : '#eef1f3'}`,
                      borderRadius: 11,
                      padding: 7,
                      background: dayHolidays.length ? '#fdf8ee' : '#fbfcfc',
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
                          setHolidayModal({ editing: null, date: cell.date })
                        }}
                        title="Add public holiday"
                        style={{ width: 16, height: 16, borderRadius: 5, background: '#eef1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#647680', fontSize: 12 }}
                      >
                        +
                      </span>
                    </div>
                    {dayHolidays.map((h) => (
                      <div
                        key={h.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setHolidayModal({ editing: h })
                        }}
                        style={{ fontSize: 10, fontWeight: 800, color: HOLIDAY_SWATCH.color, background: HOLIDAY_SWATCH.bg, borderRadius: 6, padding: '2px 5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                      >
                        {h.name}
                      </div>
                    ))}
                    {dayLeaves.slice(0, 2).map((l) => (
                      <div
                        key={l.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setLeaveModal({ editing: l })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#fff',
                          border: '1px solid #e6ebee',
                          borderLeft: `3px solid ${leaveTypeStyle(l.type).color}`,
                          borderRadius: 7,
                          padding: '3px 6px',
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {employeeName(l.employee_id)} · {l.type}
                        </span>
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8895a0' }}>+{dayLeaves.length - 2} more</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16 }}>
        <div className="ml-card" style={{ padding: isMobile ? '14px 14px' : '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>Leave log</div>
          {filteredLeaves.length === 0 && <div className="ml-empty" style={{ padding: '20px 0' }}>No leave logged yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredLeaves.slice(0, 30).map((l) => (
              <div
                key={l.id}
                onClick={() => setLeaveModal({ editing: l })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border-soft)', cursor: 'pointer' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: repColor(employeeName(l.employee_id)), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {initials(employeeName(l.employee_id))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {employeeName(l.employee_id)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {shortDay(l.start_date)} – {shortDay(l.end_date)} · {leaveDays(l.start_date, l.end_date)}d
                  </div>
                </div>
                <Pill swatch={leaveTypeStyle(l.type)}>{l.type}</Pill>
              </div>
            ))}
          </div>
        </div>

        <div className="ml-card" style={{ padding: isMobile ? '14px 14px' : '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Public holidays</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="ml-select" value={countryF} onChange={(e) => setCountryF(e.target.value)} style={{ borderRadius: 9, fontSize: 11.5, fontWeight: 600, padding: '6px 8px' }}>
                <option value="all">All countries</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button className="ml-btn ml-btn--ghost" onClick={() => setHolidayModal({ editing: null })} style={{ padding: '6px 10px', fontSize: 11.5 }}>
                <Icon name="plus" size={12} strokeWidth={2.8} />
                Add
              </button>
            </div>
          </div>
          {upcomingHolidays.length === 0 && <div className="ml-empty" style={{ padding: '20px 0' }}>No upcoming holidays.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingHolidays.map((h) => (
              <div
                key={h.id}
                onClick={() => setHolidayModal({ editing: h })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border-soft)', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{h.country} · {shortDay(h.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {leaveModal && (
        <LeaveModal
          editing={leaveModal.editing}
          employees={employees}
          defaultDate={leaveModal.date}
          onClose={() => setLeaveModal(null)}
          onSaved={reloadLeaves}
        />
      )}
      {holidayModal && (
        <HolidayModal editing={holidayModal.editing} defaultDate={holidayModal.date} onClose={() => setHolidayModal(null)} onSaved={reloadHolidays} />
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="ml-card" style={{ borderRadius: 13, padding: '13px 15px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 21, color: accent ?? 'var(--ink)' }}>{value}</div>
    </div>
  )
}
