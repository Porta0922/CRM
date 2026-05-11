// lib/supabase/types.ts
// Tipos generados manualmente (reemplazar con: npx supabase gen types typescript)

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nombre: string; email: string; created_at: string }
        Insert: { id: string; nombre: string; email: string; created_at?: string }
        Update: { nombre?: string; email?: string }
      }
      borrowers: {
        Row: {
          id: string; created_by: string; nombre: string
          contacto: string | null; notas: string | null; created_at: string
        }
        Insert: {
          id?: string; created_by: string; nombre: string
          contacto?: string | null; notas?: string | null
        }
        Update: { nombre?: string; contacto?: string | null; notas?: string | null }
      }
      loans: {
        Row: {
          id: string; numero_prestamo: number; borrower_id: string; monto_principal: number
          tasa_interes_mensual: number; fecha_inicio: string
          cuotas_totales: number; estado: 'activo' | 'finalizado'; created_at: string
        }
        Insert: {
          id?: string; borrower_id: string; monto_principal: number
          tasa_interes_mensual: number; fecha_inicio: string
          cuotas_totales: number; estado?: 'activo' | 'finalizado'
        }
        Update: { estado?: 'activo' | 'finalizado' }
      }
      installments: {
        Row: {
          id: string; loan_id: string; numero_cuota: number
          monto_cuota: number; monto_capital: number; monto_interes: number
          saldo_restante: number; fecha_vencimiento: string
          estado: 'pendiente' | 'pagado'; fecha_pago: string | null; created_at: string
        }
        Insert: {
          id?: string; loan_id: string; numero_cuota: number
          monto_cuota: number; monto_capital: number; monto_interes: number
          saldo_restante: number; fecha_vencimiento: string
          estado?: 'pendiente' | 'pagado'; fecha_pago?: string | null
        }
        Update: { estado?: 'pendiente' | 'pagado'; fecha_pago?: string | null }
      }
    }
    Views: {
      loan_summary: { Row: LoanSummaryRow }
      weekly_due: { Row: WeeklyDueRow }
      calendar_monthly: { Row: CalendarMonthlyRow }
      dashboard_kpis: { Row: DashboardKpisRow }
    }
  }
}

export interface LoanSummaryRow {
  id: string; numero_prestamo: number; borrower_id: string; borrower_nombre: string
  borrower_contacto: string | null; created_by: string
  monto_principal: number; tasa_interes_mensual: number
  fecha_inicio: string; cuotas_totales: number; estado: string
  cuotas_count: number; cuotas_pagadas: number; cuotas_pendientes: number
  total_a_pagar: number; total_intereses: number
  total_cobrado: number; total_pendiente: number
  proxima_cuota_fecha: string | null; proxima_cuota_monto: number | null
}

export interface WeeklyDueRow {
  id: string; loan_id: string; numero_cuota: number
  monto_cuota: number; fecha_vencimiento: string; estado: string
  monto_principal: number; borrower_nombre: string
  borrower_contacto: string | null; created_by: string; dias_restantes: number
}

export interface CalendarMonthlyRow {
  mes: string; mes_key: string; cuotas_count: number
  total_mes: number; created_by: string; cuotas: Json
}

export interface DashboardKpisRow {
  created_by: string; total_prestamos: number; prestamos_activos: number
  total_capital_prestado: number; total_intereses_proyectados: number
  total_cobrado: number; total_por_cobrar: number; cuotas_vencidas: number
}
