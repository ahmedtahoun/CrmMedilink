import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MarketKey, Workspace } from '../lib/constants'

type BoardType = 'closer' | 'trainer'
type BoardView = 'board' | 'table' | 'analytics'
type CalView = 'month' | 'week' | 'day'

interface AppState {
  // navigation
  workspace: Workspace
  market: MarketKey
  boardType: BoardType
  view: BoardView
  // CEO can preview the app as a non-CEO persona
  ceoPersona: boolean

  // pipeline filters
  search: string
  priority: string
  category: string
  sort: string
  repFilter: string
  selectedIds: string[]

  // calendar
  calCursor: string // YYYY-MM
  calView: CalView
  calSelectedDate: string // YYYY-MM-DD

  // finance
  financeTab: 'revenue' | 'invoices' | 'quotations' | 'expenses'

  // transient UI
  toast: string

  setWorkspace: (w: Workspace) => void
  setMarket: (m: MarketKey) => void
  setBoardType: (b: BoardType) => void
  setView: (v: BoardView) => void
  toggleCeoPersona: () => void
  setFilter: (patch: Partial<Pick<AppState, 'search' | 'priority' | 'category' | 'sort' | 'repFilter'>>) => void
  toggleSelected: (id: string) => void
  clearSelection: () => void
  selectMany: (ids: string[]) => void
  setCalCursor: (c: string) => void
  setCalView: (v: CalView) => void
  setCalSelectedDate: (d: string) => void
  setFinanceTab: (t: AppState['financeTab']) => void
  showToast: (msg: string) => void
}

const now = new Date()
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const ymd = `${ym}-${String(now.getDate()).padStart(2, '0')}`

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      workspace: 'ceo',
      market: 'egypt',
      boardType: 'closer',
      view: 'board',
      ceoPersona: true,

      search: '',
      priority: 'all',
      category: 'all',
      sort: 'priority',
      repFilter: 'all',
      selectedIds: [],

      calCursor: ym,
      calView: 'month',
      calSelectedDate: ymd,

      financeTab: 'revenue',
      toast: '',

      setWorkspace: (workspace) => set({ workspace, selectedIds: [] }),
      setMarket: (market) => set({ market, selectedIds: [] }),
      setBoardType: (boardType) => set({ boardType, selectedIds: [] }),
      setView: (view) => set({ view }),
      toggleCeoPersona: () => set((s) => ({ ceoPersona: !s.ceoPersona })),
      setFilter: (patch) => set(patch),
      toggleSelected: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      clearSelection: () => set({ selectedIds: [] }),
      selectMany: (ids) => set({ selectedIds: ids }),
      setCalCursor: (calCursor) => set({ calCursor }),
      setCalView: (calView) => set({ calView }),
      setCalSelectedDate: (calSelectedDate) => set({ calSelectedDate }),
      setFinanceTab: (financeTab) => set({ financeTab }),
      showToast: (toast) => {
        set({ toast })
        if (toastTimer) clearTimeout(toastTimer)
        toastTimer = setTimeout(() => set({ toast: '' }), 2600)
      },
    }),
    {
      name: 'ml360-ui',
      partialize: (s) => ({
        workspace: s.workspace,
        market: s.market,
        boardType: s.boardType,
        view: s.view,
        ceoPersona: s.ceoPersona,
        financeTab: s.financeTab,
      }),
    },
  ),
)
