import type {
  AccessModuleKey,
  AccessRoleKey,
  CloserStage,
  MarketKey,
  Role,
  TrainerStage,
} from './constants'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  created_at?: string
}

export interface Clinic {
  id: string
  name: string
  cat: string
  pri: 'High' | 'Medium' | 'Low'
  area: string | null
  street: string | null
  maps_link: string | null
  contact: string | null
  phone: string | null
  email: string | null
  website: string | null
  healthcare_type: string | null
  business_type: string | null
  medical_cats: string[] | null
  segment: string | null
  ownership: string | null
  chain_name: string | null
  current_system: string | null
  closer: string | null
  trainer: string | null
  market: MarketKey
  cs: CloserStage
  ts: TrainerStage | null
  cs_date: string | null
  ai_score: number
  mrr: number
  mrr_usd: number
  overdue: boolean
  trial_from: string | null
  trial_to: string | null
  sub_from: string | null
  sub_to: string | null
  sub_status: 'active' | 'trial' | 'expired' | 'inactive'
  sub_reason: string | null
  board_order: number
  is_provider: boolean
  created_at?: string
  updated_at?: string
}

export interface ClinicComment {
  id: string
  clinic_id: string
  author: string
  author_id: string | null
  text: string
  type: string
  created_at: string
}

export interface TrainingSession {
  id: string
  clinic_id: string
  type: string
  date: string | null
  time: string | null
  duration: string | null
  mode: string | null
  trainer: string | null
  attendees: string | null
  notes: string | null
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  created_at?: string
}

export interface ClinicTask {
  id: string
  clinic_id: string
  title: string
  due: string | null
  done: boolean
  owner: string | null
  created_at?: string
}

export interface CalendarEvent {
  id: string
  title: string
  type: string
  priority: string
  clinic_id: string | null
  date: string
  time: string | null
  notes: string | null
  done: boolean
  market: MarketKey
  owner: string
  booking_id: string | null
  created_at?: string
}

export interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  country: string
  department: string | null
  position: string | null
  employment_type: string | null
  status: 'active' | 'inactive' | 'left'
  start_date: string | null
  manager: string | null
  base_salary: number | null
  currency: string | null
  commission_rate: number | null
  allowance: number | null
  notes: string | null
  documents: Record<string, string | null> | null
  created_at?: string
}

export interface LineItem {
  id?: string
  description: string
  qty: number
  unit_price: number
}

export interface Invoice {
  id: string
  clinic_id: string | null
  reference: string | null
  issue_date: string | null
  due_date: string | null
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue'
  discount_pct: number
  tax_pct: number
  notes: string | null
  market: MarketKey
  line_items?: LineItem[]
  created_at?: string
}

export interface Quotation {
  id: string
  clinic_id: string | null
  reference: string | null
  issue_date: string | null
  valid_until: string | null
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined'
  discount_pct: number
  tax_pct: number
  notes: string | null
  market: MarketKey
  line_items?: LineItem[]
  created_at?: string
}

export interface Expense {
  id: string
  description: string
  category: string
  vendor: string | null
  date: string | null
  amount: number
  notes: string | null
  market: MarketKey
  created_at?: string
}

export interface RevenueCell {
  id?: string
  clinic_id: string
  market: MarketKey
  year: number
  month: number // 1-12
  amount: number
}

export interface CountryDocument {
  id: string
  country: string
  name: string
  storage_path: string
  uploaded_at: string
  uploaded_by: string | null
}

export type AccessMatrix = Record<AccessRoleKey, Record<AccessModuleKey, boolean>>

export interface FaqCategory {
  id: string
  name: string
  sort: number
}
export interface FaqItem {
  id: string
  category_id: string
  q: string
  a: string
  sort: number
}

export interface FxRateRow {
  market: MarketKey
  usd_per_unit: number
}
