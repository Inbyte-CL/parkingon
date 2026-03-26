export type UserRole = 'operador' | 'admin_empresa' | 'superadmin'

export interface Organization {
  id: string
  name: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface Parking {
  id: string
  org_id: string
  name: string
  address?: string
  total_spaces: number | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface Membership {
  id: string
  org_id: string
  user_id: string
  parking_id?: string
  role: UserRole
  status: 'active' | 'inactive'
  display_name?: string
  created_at: string
}

export interface Tariff {
  id: string
  org_id: string
  parking_id?: string
  price_per_minute: number
  valid_from: string
  valid_until?: string
  created_at: string
}

export interface Shift {
  id: string
  user_id: string
  parking_id: string
  status: 'open' | 'closed'
  opening_cash?: number
  closing_cash?: number
  opened_at: string
  closed_at?: string
}

export interface Session {
  id: string
  shift_id: string
  plate: string
  entry_time: string
  exit_time?: string
  status: 'open' | 'closed'
  session_code?: string
}
