/**
 * MediLink360 CRM Data Model (v1)
 * Complete schema for clinic, employee, subscription, training lifecycle
 */

export const COUNTRIES = ['Egypt', 'UAE', 'Saudi Arabia', 'Qatar'];

export const CURRENCIES = {
  'Egypt': { code: 'EGP', symbol: '£' },
  'UAE': { code: 'AED', symbol: 'د.إ' },
  'Saudi Arabia': { code: 'SAR', symbol: '﷼' },
  'Qatar': { code: 'QAR', symbol: '﷼' }
};

export const CLINIC_STAGES = [
  'Today\'s Lead',
  'Follow up Visit',
  'Proposal Sent',
  'Free Trial',
  'MOU Signed'
];

export const TRAINING_STAGES = [
  'Training Assigned',
  'Training Scheduled',
  'Reception Training',
  'Doctor Training',
  'Follow-up',
  'Clinic Live'
];

export const SUBSCRIPTION_STATUS = {
  'active': { label: 'Active', color: '#0e9f6e' },
  'trial': { label: 'Free Trial', color: '#2563eb' },
  'expired': { label: 'Expired', color: '#f59e0b' },
  'inactive': { label: 'Deactivated', color: '#dc2626' }
};

export const DEACTIVATION_REASONS = [
  'Too Expensive',
  'Competitor',
  'Existing System',
  'No Response',
  'Trial Ended',
  'Cancelled Subscription',
  'Other'
];

export const HEALTHCARE_TYPES = ['Clinic', 'Hospital', 'Medical Center'];

export const BUSINESS_TYPES = ['Private', 'Government', 'University', 'NGO'];

export const MEDICAL_CATEGORIES = [
  'Dental', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics',
  'ENT', 'Ophthalmology', 'Neurology', 'Internal Medicine', 'General Practice',
  'Physiotherapy', 'Gynecology', 'Psychiatry', 'Urology', 'Radiology',
  'Laboratory', 'Multi-specialty'
];

export const SEGMENTS = ['Solo Practice', 'Small Clinic', 'Medium Clinic', 'Large Clinic', 'Hospital', 'Enterprise'];

export const CURRENT_SYSTEMS = ['Paper', 'Excel', 'Vezeeta', 'Clinido', 'Custom System', 'Other'];

export const EMPLOYEE_ROLES = ['Sales Closer', 'Trainer', 'Manager', 'Admin'];

/**
 * CLINIC SCHEMA
 */
export const ClinicTemplate = {
  id: '', // 'x' + timestamp
  name: '',
  country: 'Egypt',
  
  // Healthcare Info
  healthcareType: '', // Clinic | Hospital | Medical Center
  businessType: '', // Private | Government | University | NGO
  medicalCategories: [], // [Dental, Cardiology, ...]
  segment: '', // Solo Practice | Small Clinic | Medium Clinic | Large Clinic | Hospital | Enterprise
  ownership: '', // Independent | Chain
  chainName: '',
  currentSystem: '', // Paper | Excel | Vezeeta | Clinido | Custom | Other
  
  // Location & Contact
  area: '',
  street: '',
  mapsLink: '',
  contact: '', // Contact person name
  phone: '',
  email: '',
  website: '',
  
  // Sales Pipeline
  priority: 'Medium', // High | Medium | Low
  salesCloser: '', // Employee ID
  salesCloserName: '',
  cs: 'Today\'s Lead', // Sales stage
  csDate: null, // Date stage was entered
  
  // Subscription
  trialStartDate: null,
  trialEndDate: null,
  subStartDate: null,
  subEndDate: null,
  subStatus: 'active', // active | trial | expired | inactive
  subReason: '', // Deactivation reason if inactive
  mrr: 0, // Monthly recurring revenue in local currency
  mrrUSD: 0, // MRR converted to USD
  
  // Training
  trainer: '', // Employee ID
  trainerName: '',
  trainingStage: null, // null | Training Assigned | Training Scheduled | Reception Training | ...
  trainingSchedules: [], // Array of { date, time, type: 'reception'|'doctor', notes }
  
  // Metadata
  createdAt: null,
  updatedAt: null,
  notes: 0, // Comment count
  comments: [], // [{ id, author, text, date }]
  aiScore: 0, // 0-100 AI engagement score
  overdue: false
};

/**
 * EMPLOYEE SCHEMA
 */
export const EmployeeTemplate = {
  id: '', // 'emp_' + timestamp
  name: '',
  role: '', // Sales Closer | Trainer | Manager | Admin
  country: 'Egypt',
  email: '',
  phone: '',
  
  // Commission
  commissionPlan: '', // Reference to commission plan
  commissionRate: 0, // % per subscription
  totalCommission: 0, // Sum in local currency
  totalCommissionUSD: 0, // Sum in USD
  
  // Performance
  clinicsAdded: 0,
  clinicsSigned: 0,
  closureRate: 0, // % (clinicsSigned / clinicsAdded)
  avgCycleDays: 0,
  
  // Trainer-specific
  clinicsTrained: 0,
  avgTrainingDays: 0,
  
  // HR
  status: 'active', // active | inactive | left
  joinDate: null,
  salary: 0, // Local currency
  salaryUSD: 0,
  
  // Metadata
  createdAt: null,
  updatedAt: null
};

/**
 * TRAINING SESSION SCHEMA
 */
export const TrainingSessionTemplate = {
  id: '', // 'train_' + timestamp
  clinicId: '',
  clinicName: '',
  trainerId: '',
  trainerName: '',
  
  type: '', // reception | doctor | followup
  scheduledDate: null,
  scheduledTime: '',
  completedDate: null,
  status: 'scheduled', // scheduled | completed | cancelled
  
  attendees: [],
  notes: '',
  
  createdAt: null,
  updatedAt: null
};

/**
 * COMMISSION PLAN SCHEMA
 */
export const CommissionPlanTemplate = {
  id: '', // 'plan_' + timestamp
  name: '', // e.g. "Standard 2024"
  country: 'Egypt',
  
  // Tiers based on MRR
  tiers: [
    { mrrMin: 0, mrrMax: 500, percentage: 5 },
    { mrrMin: 500, mrrMax: 1000, percentage: 7 },
    { mrrMin: 1000, mrrMax: 99999, percentage: 10 }
  ],
  
  createdAt: null,
  updatedAt: null
};

/**
 * COMMENT SCHEMA
 */
export const CommentTemplate = {
  id: '', // 'cmt_' + timestamp
  clinicId: '',
  author: '', // Employee name
  authorId: '',
  text: '',
  createdAt: null
};

/**
 * SAMPLE DATA (initial state)
 */
export const SAMPLE_EMPLOYEES = [
  {
    id: 'emp_1', name: 'Ahmed Hassan', role: 'Sales Closer', country: 'Egypt',
    email: 'ahmed@medilink.com', phone: '+201012345678',
    commissionPlan: 'plan_1', commissionRate: 10, totalCommission: 2500, totalCommissionUSD: 50,
    clinicsAdded: 15, clinicsSigned: 6, closureRate: 40, avgCycleDays: 45,
    status: 'active', joinDate: new Date('2023-01-15'), salary: 3000, salaryUSD: 100
  },
  {
    id: 'emp_2', name: 'Nourhan Ali', role: 'Trainer', country: 'Egypt',
    email: 'nourhan@medilink.com', phone: '+201087654321',
    commissionPlan: 'plan_1', commissionRate: 5, totalCommission: 800, totalCommissionUSD: 16,
    clinicsTrained: 8, avgTrainingDays: 14,
    status: 'active', joinDate: new Date('2023-02-01'), salary: 2500, salaryUSD: 83
  },
  {
    id: 'emp_3', name: 'Sara Mohamed', role: 'Sales Closer', country: 'UAE',
    email: 'sara@medilink.com', phone: '+971501234567',
    commissionPlan: 'plan_2', commissionRate: 10, totalCommission: 1500, totalCommissionUSD: 30,
    clinicsAdded: 12, clinicsSigned: 5, closureRate: 42, avgCycleDays: 40,
    status: 'active', joinDate: new Date('2023-03-10'), salary: 3500, salaryUSD: 116
  }
];

export const SAMPLE_CLINICS = [
  {
    id: 'x1', name: 'Dr. Samir Dental Center', country: 'Egypt',
    healthcareType: 'Clinic', businessType: 'Private', medicalCategories: ['Dental'],
    segment: 'Small Clinic', ownership: 'Independent', currentSystem: 'Excel',
    area: 'Nasr City', street: '15 Tahrir Square', contact: 'Dr. Samir Fahmy', phone: '+201012345678',
    email: 'samir@dental.com', website: 'www.samirdental.com',
    priority: 'High', salesCloser: 'emp_1', salesCloserName: 'Ahmed Hassan',
    cs: 'Today\'s Lead', csDate: new Date(), trialStartDate: null, trialEndDate: null,
    subStartDate: null, subEndDate: null, subStatus: 'active', subReason: '',
    mrr: 350, mrrUSD: 7, trainer: 'emp_2', trainerName: 'Nourhan Ali',
    trainingStage: null, trainingSchedules: [],
    createdAt: new Date(), updatedAt: new Date(), notes: 2, comments: [],
    aiScore: 72, overdue: false
  }
];

export const SAMPLE_COMMISSION_PLANS = [
  {
    id: 'plan_1', name: 'Standard Egypt 2024', country: 'Egypt',
    tiers: [
      { mrrMin: 0, mrrMax: 500, percentage: 5 },
      { mrrMin: 500, mrrMax: 1000, percentage: 7 },
      { mrrMin: 1000, mrrMax: 99999, percentage: 10 }
    ],
    createdAt: new Date(), updatedAt: new Date()
  },
  {
    id: 'plan_2', name: 'Standard UAE 2024', country: 'UAE',
    tiers: [
      { mrrMin: 0, mrrMax: 600, percentage: 6 },
      { mrrMin: 600, mrrMax: 1200, percentage: 8 },
      { mrrMin: 1200, mrrMax: 99999, percentage: 12 }
    ],
    createdAt: new Date(), updatedAt: new Date()
  }
];
