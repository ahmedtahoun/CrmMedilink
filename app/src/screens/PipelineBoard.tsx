import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Profile } from '../lib/types'
import type { Clinic } from '../lib/types'
import { CLINIC_CATEGORIES } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useClinics, moveClinicStage, bulkAssign, bulkMoveStage } from '../lib/clinics'
import {
  buildColumns,
  filterAndSort,
  riskFlags,
  stageDefs,
  stageTitle,
  trialDaysLeft,
  type BoardType,
} from '../lib/pipeline'
import { catStyle, priStyle, stageColorFor } from '../lib/styles'
import { shortDay } from '../lib/format'
import TopBar from '../components/TopBar'
import Pill from '../components/Pill'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import ClinicDetailModal from '../modals/ClinicDetailModal'
import Calendar from './Calendar'

interface Props {
  profile: Profile
  boardType: BoardType
  onAddClinic: () => void
}

export default function PipelineBoard({ profile, boardType, onAddClinic }: Props) {
  const { market, view, setView, search, priority, category, sort, repFilter } = useAppStore()
  const showToast = useAppStore((s) => s.showToast)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const toggleSelected = useAppStore((s) => s.toggleSelected)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const selectMany = useAppStore((s) => s.selectMany)

  const { clinics, loading, error } = useClinics(market)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({ search, priority, category, sort, repFilter }),
    [search, priority, category, sort, repFilter],
  )
  const columns = useMemo(() => buildColumns(clinics, boardType, filters), [clinics, boardType, filters])
  const flatRows = useMemo(() => filterAndSort(clinics, boardType, filters), [clinics, boardType, filters])

  const reps = useMemo(() => {
    const key = boardType === 'closer' ? 'closer' : 'trainer'
    return [...new Set(clinics.map((c) => c[key]).filter(Boolean) as string[])].sort()
  }, [clinics, boardType])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id))
  }

  async function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const id = String(e.active.id)
    const overCol = e.over?.id ? String(e.over.id) : null
    if (!overCol) return
    const clinic = clinics.find((c) => c.id === id)
    if (!clinic) return
    const curStage = boardType === 'closer' ? clinic.cs : clinic.ts ?? 'handoff'
    if (curStage === overCol) return

    const targetCount = columns.find((c) => c.key === overCol)?.clinics.length ?? 0
    const err = await moveClinicStage(id, boardType, overCol as never, targetCount + 1)
    if (err) showToast(err)
    else showToast(`${clinic.name} → ${stageTitle(boardType, overCol)}`)
  }

  const dragClinic = dragId ? clinics.find((c) => c.id === dragId) ?? null : null

  const tabs = [
    { key: 'board', label: 'Board' as const },
    { key: 'table', label: 'Table' as const },
    { key: 'calendar', label: 'Calendar' as const },
  ]
  const activeTab = view === 'table' ? 'table' : view === 'calendar' ? 'calendar' : 'board'

  return (
    <>
      <TopBar
        title={boardType === 'trainer' ? 'Training pipeline' : 'Sales pipeline'}
        tabs={tabs}
        activeTab={activeTab}
        onTab={(k) => setView(k as 'board' | 'table' | 'calendar')}
        showFilters={activeTab !== 'calendar'}
        categories={CLINIC_CATEGORIES}
        reps={reps}
        right={
          boardType === 'closer' && (
            <button className="ml-btn" onClick={onAddClinic} style={{ fontSize: 13.5 }}>
              <Icon name="plus" size={15} strokeWidth={2.6} />
              Add clinic
            </button>
          )
        }
      />

      {view === 'calendar' && <Calendar />}

      {view !== 'calendar' && (
      <div style={{ flex: 1, overflow: 'auto', padding: '0 26px 24px' }}>
        {loading && <div className="ml-empty">Loading clinics…</div>}
        {error && <div className="ml-empty" style={{ color: 'var(--danger)' }}>{error}</div>}

        {!loading && !error && view !== 'table' && (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start', paddingBottom: 8 }}>
              {columns.map((col) => (
                <BoardColumn
                  key={col.key}
                  colKey={col.key}
                  title={col.title}
                  count={col.clinics.length}
                >
                  {col.clinics.map((c) => (
                    <ClinicCard
                      key={c.id}
                      clinic={c}
                      board={boardType}
                      onClick={() => setDetailId(c.id)}
                    />
                  ))}
                  {col.clinics.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'var(--empty)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '26px 14px',
                        lineHeight: 1.5,
                      }}
                    >
                      No clinics in this stage.
                    </div>
                  )}
                </BoardColumn>
              ))}
            </div>
            <DragOverlay>
              {dragClinic && <ClinicCard clinic={dragClinic} board={boardType} overlay />}
            </DragOverlay>
          </DndContext>
        )}

        {!loading && !error && view === 'table' && (
          <TableView
            rows={flatRows}
            board={boardType}
            selectedIds={selectedIds}
            onToggle={toggleSelected}
            onToggleAll={(ids) => (selectedIds.length === ids.length ? clearSelection() : selectMany(ids))}
            onOpen={setDetailId}
            onBulkAssign={async (rep) => {
              const err = await bulkAssign(selectedIds, rep, boardType)
              if (err) showToast(err)
              else {
                showToast(`${selectedIds.length} reassigned to ${rep}`)
                clearSelection()
              }
            }}
            onBulkStage={async (stage) => {
              const err = await bulkMoveStage(selectedIds, boardType, stage as never)
              if (err) showToast(err)
              else {
                showToast(`${selectedIds.length} moved to ${stageTitle(boardType, stage)}`)
                clearSelection()
              }
            }}
            onClearSelection={clearSelection}
            reps={reps}
          />
        )}
      </div>
      )}

      {detailId && (
        <ClinicDetailModal
          clinicId={detailId}
          profile={profile}
          board={boardType}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  )
}

function BoardColumn({
  colKey,
  title,
  count,
  children,
}: {
  colKey: string
  title: string
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey })
  return (
    <div
      style={{
        width: 290,
        flexShrink: 0,
        background: isOver ? '#dfe6e3' : '#e6eaed',
        borderRadius: 16,
        padding: 13,
        display: 'flex',
        flexDirection: 'column',
        transition: 'background .12s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 13,
          padding: '2px 5px',
        }}
      >
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          {title}
        </span>
        <span
          style={{
            background: '#fff',
            color: '#5b6a73',
            fontSize: 12,
            fontWeight: 700,
            minWidth: 24,
            height: 24,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 7px',
          }}
        >
          {count}
        </span>
      </div>
      <div ref={setNodeRef} style={{ flex: 1, minHeight: 90, borderRadius: 11 }}>
        {children}
      </div>
    </div>
  )
}

function ClinicCard({
  clinic,
  board,
  onClick,
  overlay,
}: {
  clinic: Clinic
  board: BoardType
  onClick?: () => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: clinic.id })
  const st = stageColorFor(clinic.cs, clinic.ts)
  const cat = catStyle(clinic.cat)
  const pri = priStyle(clinic.pri)
  const rep = board === 'closer' ? clinic.closer : clinic.trainer
  const flags = riskFlags(clinic)
  const tdl = trialDaysLeft(clinic)
  const isLive = clinic.cs === 'signed' && clinic.ts === 'live'
  const isTrainer = board === 'trainer'
  const trainerStageKeys = ['handoff', 'scheduled', 'reception', 'followup', 'live']
  const progressPct = isTrainer
    ? Math.round(((trainerStageKeys.indexOf(clinic.ts ?? 'handoff') + 1) / trainerStageKeys.length) * 100)
    : 0
  const contractLabel = clinic.cs === 'commission' ? 'Commission Based' : 'Contract Subscription'

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #eef1f3',
        borderLeft: `4px solid ${st.color}`,
        borderRadius: 14,
        padding: '14px 15px',
        marginBottom: 11,
        cursor: overlay ? 'grabbing' : 'pointer',
        boxShadow: overlay ? '0 16px 34px rgba(20,50,60,.22)' : '0 1px 2px rgba(20,40,50,.05)',
        opacity: isDragging && !overlay ? 0.4 : 1,
        animation: overlay ? undefined : 'floatIn .3s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
        <span
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 600,
            fontSize: 14.5,
            color: '#16242e',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {clinic.name}
        </span>
        {isLive && (
          <span
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 800,
              color: '#0e7d43',
              background: '#dcf5e6',
              border: '1px solid #a6e6c3',
              padding: '3px 8px',
              borderRadius: 20,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1fae5c', animation: 'pulseDot 1.8s infinite' }} />
            LIVE
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {rep && <Avatar name={rep} size={20} />}
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#7a8891',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {rep || 'Unassigned'}
          </span>
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            color: '#5c6c75',
            background: '#f1f4f6',
            padding: '3px 8px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {shortDay(clinic.cs_date ?? clinic.created_at ?? null)}
        </span>
      </div>

      {isTrainer && (
        <div style={{ marginBottom: 9 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: 20,
              background: clinic.cs === 'commission' ? '#fbf1e0' : '#e7f0fe',
              color: clinic.cs === 'commission' ? '#b45309' : '#2563eb',
            }}
          >
            {contractLabel}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Pill swatch={cat}>{clinic.cat}</Pill>
        <Pill swatch={pri}>{clinic.pri}</Pill>
        {tdl !== null && tdl >= 0 && tdl <= 7 && (
          <Pill swatch={{ color: '#b45309', bg: '#fef3e2' }}>Trial {tdl}d</Pill>
        )}
        {flags.map((f) => (
          <Pill
            key={f.label}
            swatch={f.tone === 'danger' ? { color: '#dc2626', bg: '#fdecec' } : { color: '#b45309', bg: '#fbf1e0' }}
          >
            {f.label}
          </Pill>
        ))}
      </div>

      {isTrainer && (
        <>
          <div
            style={{
              marginTop: 11,
              paddingTop: 11,
              borderTop: '1px solid #f1f4f6',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 10px',
              fontSize: 11,
              color: '#7a8891',
              fontWeight: 600,
            }}
          >
            <div>Trainer: <span style={{ color: '#33424c' }}>{clinic.trainer || '—'}</span></div>
            <div>Sales rep: <span style={{ color: '#33424c' }}>{clinic.closer || '—'}</span></div>
            <div>Trial ends: <span style={{ color: '#33424c' }}>{shortDay(clinic.trial_to)}</span></div>
            <div>Sub ends: <span style={{ color: '#33424c' }}>{shortDay(clinic.sub_to)}</span></div>
          </div>
          <div style={{ marginTop: 9, height: 6, background: '#eef1f3', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#17c08f,#0e9270)', borderRadius: 99 }} />
          </div>
        </>
      )}
    </div>
  )
}

function TableView({
  rows,
  board,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpen,
  onBulkAssign,
  onBulkStage,
  onClearSelection,
  reps,
}: {
  rows: Clinic[]
  board: BoardType
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: (ids: string[]) => void
  onOpen: (id: string) => void
  onBulkAssign: (rep: string) => void
  onBulkStage: (stage: string) => void
  onClearSelection: () => void
  reps: string[]
}) {
  const allIds = rows.map((r) => r.id)
  const grid = '32px 2fr 1.1fr .9fr 1.3fr 1.1fr 1.2fr'

  return (
    <div>
      {selectedIds.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#0c1920',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{selectedIds.length} selected</span>
          <select
            onChange={(e) => e.target.value && onBulkAssign(e.target.value)}
            value=""
            style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: '#16242d', color: '#fff', border: '1px solid #33424c' }}
          >
            <option value="">Reassign to…</option>
            {reps.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            onChange={(e) => e.target.value && onBulkStage(e.target.value)}
            value=""
            style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: '#16242d', color: '#fff', border: '1px solid #33424c' }}
          >
            <option value="">Move to stage…</option>
            {stageDefs(board).map((s) => (
              <option key={s.key} value={s.key}>
                {s.title}
              </option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <div onClick={onClearSelection} style={{ fontSize: 12.5, fontWeight: 700, color: '#aec0c6', cursor: 'pointer' }}>
            Clear
          </div>
        </div>
      )}

      <div className="ml-card" style={{ overflow: 'hidden', animation: 'fadeIn .3s ease' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            gap: 12,
            padding: '13px 20px',
            background: 'var(--surface-alt)',
            borderBottom: '1px solid var(--border-2)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: '#96a3ab',
            alignItems: 'center',
          }}
        >
          <input
            type="checkbox"
            checked={allIds.length > 0 && selectedIds.length === allIds.length}
            onChange={() => onToggleAll(allIds)}
            style={{ width: 15, height: 15, cursor: 'pointer' }}
          />
          <span>Clinic</span>
          <span>Category</span>
          <span>Priority</span>
          <span>Stage</span>
          <span>Rep</span>
          <span>Area</span>
        </div>
        {rows.map((r) => {
          const st = stageColorFor(r.cs, r.ts)
          const rep = board === 'closer' ? r.closer : r.trainer
          const stageKey = board === 'closer' ? r.cs : r.ts ?? 'handoff'
          return (
            <div
              key={r.id}
              onClick={() => onOpen(r.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: grid,
                gap: 12,
                padding: '15px 20px',
                borderBottom: '1px solid var(--border-soft)',
                fontSize: 13.5,
                alignItems: 'center',
                cursor: 'pointer',
                borderLeft: `4px solid ${st.color}`,
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(r.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle(r.id)}
                style={{ width: 15, height: 15, cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--ink-2)' }}>{r.name}</span>
              <span>
                <Pill swatch={catStyle(r.cat)}>{r.cat}</Pill>
              </span>
              <span>
                <Pill swatch={priStyle(r.pri)}>{r.pri}</Pill>
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{stageTitle(board, stageKey)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, color: 'var(--text-2)' }}>
                {rep && <Avatar name={rep} size={22} />}
                {rep || '—'}
              </span>
              <span style={{ color: 'var(--muted)' }}>{r.area || '—'}</span>
            </div>
          )
        })}
        {rows.length === 0 && <div className="ml-empty">No clinics match your filters</div>}
      </div>
    </div>
  )
}
