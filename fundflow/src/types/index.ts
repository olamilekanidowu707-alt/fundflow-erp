export type Role = 'staff' | 'manager' | 'finance' | 'admin'
export type RequestStatus = 'pending_manager' | 'approved_manager' | 'approved_finance' | 'rejected' | 'paid'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type Category = 'Travel' | 'Marketing' | 'Operations' | 'IT' | 'Training' | 'Entertainment' | 'Procurement' | 'Other'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  department: string
  avatar_url?: string
  created_at: string
}

export interface Department {
  id: string
  name: string
  monthly_budget: number
  created_at: string
}

export interface FundRequest {
  id: string
  request_number: string
  requester_id: string
  department_id: string
  purpose: string
  description?: string
  amount: number
  category: Category
  status: RequestStatus
  priority: Priority
  needed_by_date?: string
  manager_id?: string
  manager_note?: string
  manager_acted_at?: string
  finance_id?: string
  finance_note?: string
  finance_acted_at?: string
  paid_at?: string
  paid_by?: string
  payment_reference?: string
  attachment_urls?: string[]
  created_at: string
  updated_at: string
  // Joined
  requester?: Profile
  department?: Department
  manager?: Profile
  finance_officer?: Profile
}

export interface AuditLog {
  id: string
  request_id: string
  actor_id: string
  action: string
  note?: string
  metadata?: Record<string, unknown>
  created_at: string
  actor?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  request_id?: string
  created_at: string
}

export interface DepartmentBudgetSummary {
  department: Department
  total_requested: number
  total_approved: number
  total_paid: number
  remaining: number
}
