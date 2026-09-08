// Enums & lookup tables ported from design_handoff_medilink360/data-model.js
// and MediLink360 Pitch.dc.html helper methods.

export type MarketKey = 'egypt' | 'dubai' | 'ksa' | 'qatar'

export interface MarketDef {
  key: MarketKey
  label: string
  country: string
  flag: string
  currency: string
  live: boolean
}

export const MARKETS: MarketDef[] = [
  { key: 'egypt', label: 'Egypt', country: 'Egypt', flag: '🇪🇬', currency: 'EGP', live: true },
  { key: 'dubai', label: 'UAE', country: 'UAE', flag: '🇦🇪', currency: 'AED', live: true },
  { key: 'ksa', label: 'Saudi', country: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', live: false },
  { key: 'qatar', label: 'Qatar', country: 'Qatar', flag: '🇶🇦', currency: 'QAR', live: false },
]

export const MARKET_BY_KEY: Record<MarketKey, MarketDef> = Object.fromEntries(
  MARKETS.map((m) => [m.key, m]),
) as Record<MarketKey, MarketDef>

export const MARKET_LAUNCH: Partial<Record<MarketKey, string>> = {
  ksa: 'Q3 2026',
  qatar: 'Q4 2026',
}

// FX: 1 unit of local currency = N USD (prototype state.fxRates)
export const DEFAULT_FX: Record<MarketKey, number> = {
  egypt: 0.021,
  dubai: 0.272,
  ksa: 0.267,
  qatar: 0.275,
}

// --- Sales pipeline (closer board) ---
export const CLOSER_STAGES = [
  { key: 'lead', title: 'Visits' },
  { key: 'followup', title: 'Follow up Visit' },
  { key: 'proposal', title: 'Proposal Sent' },
  { key: 'commission', title: 'Commission Based' },
  { key: 'signed', title: 'Contract Subscription' },
] as const
export type CloserStage = (typeof CLOSER_STAGES)[number]['key']

// --- Training pipeline (trainer board) ---
export const TRAINER_STAGES = [
  { key: 'handoff', title: 'Contract Signed' },
  { key: 'scheduled', title: 'Training Scheduled' },
  { key: 'reception', title: 'Reception Training' },
  { key: 'followup', title: 'Follow-up Session' },
  { key: 'live', title: 'Live' },
] as const
export type TrainerStage = (typeof TRAINER_STAGES)[number]['key']

export const CLINIC_CATEGORIES = [
  'General',
  'Pediatrics',
  'Dental',
  'Dermatology',
  'Cardiology',
  'Gynecology',
  'Ophthalmology',
  'Polyclinic',
]

export const MEDICAL_CATEGORIES = [
  'Dental', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'ENT',
  'Ophthalmology', 'Neurology', 'Internal Medicine', 'General Practice',
  'Physiotherapy', 'Gynecology', 'Psychiatry', 'Urology', 'Radiology',
  'Laboratory', 'Multi-specialty',
]

export const HEALTHCARE_TYPES = ['Clinic', 'Hospital', 'Medical Center']
export const BUSINESS_TYPES = ['Private', 'Government', 'University', 'NGO']
export const SEGMENTS = ['Solo Practice', 'Small Clinic', 'Medium Clinic', 'Large Clinic', 'Hospital', 'Enterprise']
export const CURRENT_SYSTEMS = ['Paper', 'Excel', 'Vezeeta', 'Clinido', 'Custom System', 'Other']
export const PRIORITIES = ['High', 'Medium', 'Low'] as const

export const SUB_STATUS = {
  active: { label: 'Active', color: '#0e9f6e' },
  trial: { label: 'Free Trial', color: '#2563eb' },
  expired: { label: 'Expired', color: '#f59e0b' },
  inactive: { label: 'Deactivated', color: '#dc2626' },
} as const

export const DEACTIVATION_REASONS = [
  'Too Expensive', 'Competitor', 'Existing System', 'No Response',
  'Trial Ended', 'Cancelled Subscription', 'Other',
]

// --- Finance ---
export const INVOICE_STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Overdue'] as const
export const QUOTATION_STATUS_OPTIONS = ['Draft', 'Sent', 'Accepted', 'Declined'] as const
export const EXPENSE_CATEGORY_OPTIONS = [
  'Training materials', 'Trainer travel', 'Accommodation', 'Software & tools', 'Other',
]
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// --- Calendar ---
export const CAL_EVENT_TYPES = ['Task', 'Meeting', 'Follow-up', 'Reminder'] as const
export const CAL_PRIORITIES = ['High', 'Medium', 'Low'] as const

// --- HR ---
export const HR_DEPARTMENTS = ['Sales', 'Training', 'Operations', 'Marketing']
export const HR_POSITIONS = ['Sales', 'Trainer', 'Operation', 'Marketing']
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern']
export const EMPLOYEE_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left', label: 'Left' },
]
export const HR_CURRENCIES = ['USD', 'EGP', 'AED', 'SAR', 'QAR']
export const COUNTRY_OPTIONS = ['Egypt', 'UAE', 'Saudi Arabia', 'Qatar']

// --- Auth roles & workspaces ---
export type Role = 'CEO' | 'Admin' | 'Sales' | 'Trainer'
export const ROLES: Role[] = ['CEO', 'Admin', 'Sales', 'Trainer']

export type Workspace =
  | 'ceo' | 'providers' | 'closer' | 'trainer' | 'finance'
  | 'documents' | 'hr' | 'faq' | 'access'

export const WORKSPACE_ITEMS: { key: Workspace; label: string; ceoOnly?: boolean }[] = [
  { key: 'ceo', label: 'CEO Overview', ceoOnly: true },
  { key: 'providers', label: 'Providers' },
  { key: 'closer', label: 'Sales Closer' },
  { key: 'trainer', label: 'Trainer' },
  { key: 'finance', label: 'Finance' },
  { key: 'documents', label: 'Documents' },
  { key: 'hr', label: 'HR', ceoOnly: true },
  { key: 'faq', label: 'FAQ' },
  { key: 'access', label: 'Manage Access', ceoOnly: true },
]

// Access matrix: role groups (columns) that the CEO toggles per module (rows).
export const ACCESS_ROLE_KEYS = ['marketing', 'operations', 'trainerSales', 'reception'] as const
export type AccessRoleKey = (typeof ACCESS_ROLE_KEYS)[number]
export const ACCESS_ROLE_LABELS: Record<AccessRoleKey, string> = {
  marketing: 'Marketing',
  operations: 'Operations',
  trainerSales: 'Trainer / Sales',
  reception: 'Reception',
}
export const ACCESS_MODULE_KEYS = ['ceo', 'providers', 'closer', 'trainer', 'documents', 'hr', 'faq'] as const
export type AccessModuleKey = (typeof ACCESS_MODULE_KEYS)[number]
export const ACCESS_MODULE_LABELS: Record<AccessModuleKey, string> = {
  ceo: 'CEO Overview',
  providers: 'Providers',
  closer: 'Sales Closer',
  trainer: 'Trainer',
  documents: 'Documents',
  hr: 'HR',
  faq: 'FAQ',
}

export const marketCountry = (m: MarketKey) => MARKET_BY_KEY[m].country

// Appears on generated invoice / quotation PDFs. From the KEB letterhead.
export const COMPANY = {
  name: 'MediLink360', // product name — used in the doc title + file name
  legalEntity: 'KEB International Group',
  tagline: 'Key Ecosystem Builder',
  addressLines: [
    'St. 233, Building 11, Flat 14',
    'Degla, Maadi, Cairo, Egypt',
    'crm.medilink360.ai',
  ],
  footer: 'Copyright © 2026 KEB International Group  |  All Rights Reserved.  ·  Confidential',
  paymentTerms:
    'Payment due within 15 days of the invoice date by bank transfer to KEB International Group. ' +
    'Please quote the invoice number as the transfer reference.',
  quotationTerms:
    'This quotation is valid until the date shown above and is issued by KEB International Group. ' +
    'Prices are exclusive of bank transfer fees. A 1-month free trial precedes every subscription plan.',
}
