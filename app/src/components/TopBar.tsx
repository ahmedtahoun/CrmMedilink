import { useState } from 'react'
import { MARKET_BY_KEY } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useIsMobile } from '../lib/useIsMobile'
import Icon from './Icon'

interface TopBarProps {
  title: string
  titleSub?: string
  tabs?: { key: string; label: string; icon?: React.ComponentProps<typeof Icon>['name'] }[]
  activeTab?: string
  onTab?: (key: string) => void
  right?: React.ReactNode
  showFilters?: boolean
  categories?: string[]
  reps?: string[]
}

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
]
const SORT_OPTIONS = [
  { value: 'priority', label: 'Sort: Priority' },
  { value: 'name', label: 'Sort: Name' },
  { value: 'recent', label: 'Sort: Recently added' },
  { value: 'mrr', label: 'Sort: MRR' },
]

export default function TopBar({
  title,
  titleSub,
  tabs,
  activeTab,
  onTab,
  right,
  showFilters,
  categories = [],
  reps = [],
}: TopBarProps) {
  const { market, search, priority, category, sort, repFilter, setFilter } = useAppStore()
  const marketLabel = MARKET_BY_KEY[market].label
  const isMobile = useIsMobile()
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div style={{ padding: isMobile ? '14px 14px 0' : '20px 26px 0', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: isMobile ? 8 : 16,
          marginBottom: isMobile ? 10 : 16,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: isMobile ? 18 : 23,
            fontWeight: 700,
            letterSpacing: '-.6px',
            color: 'var(--ink)',
            paddingLeft: isMobile ? 52 : 0,
          }}
        >
          {title}
          {titleSub && <span style={{ color: 'var(--muted-4)' }}> · {titleSub}</span>}{' '}
          <span style={{ color: 'var(--brand)', fontWeight: 600 }}>— {marketLabel}</span>
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 8 : 12,
            flexWrap: 'wrap',
            width: isMobile ? '100%' : undefined,
          }}
        >
          {right}
          {tabs && tabs.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 4,
                background: 'var(--tab-track)',
                padding: 4,
                borderRadius: 11,
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              {tabs.map((t) => {
                const on = t.key === activeTab
                return (
                  <div
                    key={t.key}
                    onClick={() => onTab?.(t.key)}
                    style={{
                      padding: isMobile ? '7px 12px' : '8px 15px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: isMobile ? 12.5 : 13.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap',
                      background: on ? '#fff' : 'transparent',
                      color: on ? 'var(--ink)' : 'var(--muted-2)',
                      boxShadow: on ? '0 1px 3px rgba(20,40,50,.12)' : 'none',
                    }}
                  >
                    {t.icon && <Icon name={t.icon} size={14} strokeWidth={2.4} />}
                    {t.label}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 13, color: '#93a1aa', display: 'flex' }}>
              <Icon name="search" size={16} strokeWidth={2} />
            </span>
            <input
              value={search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Search clinic, contact, area…"
              className="ml-input"
              style={{ paddingLeft: 38, borderRadius: 11 }}
            />
          </div>

          {isMobile && (
            <button
              className="ml-btn ml-btn--ghost"
              onClick={() => setFiltersOpen((o) => !o)}
              style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 11 }}
            >
              <span>Filters{priority !== 'all' || category !== 'all' || repFilter !== 'all' ? ' · active' : ''}</span>
              <Icon name="chevronDown" size={15} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}

          {(!isMobile || filtersOpen) && (
          <>
          <select
            value={priority}
            onChange={(e) => setFilter({ priority: e.target.value })}
            className="ml-select"
            style={{ width: isMobile ? '100%' : 'auto', borderRadius: 11, fontWeight: 600 }}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setFilter({ category: e.target.value })}
            className="ml-select"
            style={{ width: isMobile ? '100%' : 'auto', borderRadius: 11, fontWeight: 600 }}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setFilter({ sort: e.target.value })}
            className="ml-select"
            style={{ width: isMobile ? '100%' : 'auto', borderRadius: 11, fontWeight: 600 }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {reps.length > 0 && (
            <select
              value={repFilter}
              onChange={(e) => setFilter({ repFilter: e.target.value })}
              className="ml-select"
              style={{ width: isMobile ? '100%' : 'auto', borderRadius: 11, fontWeight: 600 }}
            >
              <option value="all">All reps</option>
              {reps.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          </>
          )}
        </div>
      )}
    </div>
  )
}
