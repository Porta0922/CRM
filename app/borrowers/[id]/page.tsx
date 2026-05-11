import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  ArrowLeft, User, Phone, Mail, FileText, 
  CheckCircle, Clock, AlertCircle, Calendar,
  TrendingUp, History
} from 'lucide-react'
import type { Database, LoanSummaryRow } from '@/lib/supabase/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG', maximumFractionDigits: 0
  }).format(n)

export default async function BorrowerProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Obtener deudor
  const { data: borrower } = await supabase
    .from('borrowers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!borrower) redirect('/borrowers')

  // 2. Obtener historial de préstamos (usando la vista summary)
  const { data: loans } = await supabase
    .from('loan_summary')
    .select('*')
    .eq('borrower_id', params.id)
    .order('fecha_inicio', { ascending: false })

  // 3. Obtener todas las cuotas de todos los préstamos de este deudor para calcular mora
  const { data: allInstallments } = await supabase
    .from('installments')
    .select('*, loans!inner(borrower_id)')
    .eq('loans.borrower_id', params.id)

  type Installment = Database['public']['Tables']['installments']['Row']
  
  // Función para calcular mora de un préstamo
  const getLoanMora = (loanId: string) => {
    const loanInst = (allInstallments as any[] || []).filter(i => i.loan_id === loanId)
    let maxMora = 0
    
    loanInst.forEach(i => {
      if (i.estado === 'pagado' && i.fecha_pago && i.fecha_vencimiento) {
        const venc = new Date(i.fecha_vencimiento)
        const pago = new Date(i.fecha_pago)
        const diff = Math.ceil((pago.getTime() - venc.getTime()) / (1000 * 3600 * 24))
        if (diff > maxMora) maxMora = diff
      }
    })
    return maxMora
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/borrowers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <User className="text-blue-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{borrower.nombre}</h1>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="w-4 h-4" />
                {borrower.contacto || 'Sin contacto'}
              </div>
              {borrower.notas && (
                <div className="flex items-center gap-1.5 text-sm">
                  <FileText className="w-4 h-4" />
                  {borrower.notas}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Historial de Préstamos
                </CardTitle>
                <CardDescription>Todos los créditos otorgados a este deudor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!loans || loans.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-slate-50 rounded-xl border-2 border-dashed">
                  Este deudor aún no tiene préstamos registrados.
                </div>
              ) : (
                (loans as LoanSummaryRow[]).map((loan) => {
                  const mora = getLoanMora(loan.id)
                  const isFinished = loan.estado === 'finalizado'
                  
                  return (
                    <Link 
                      key={loan.id} 
                      href={`/loans/${loan.id}`}
                      className="block p-4 border rounded-xl hover:bg-slate-50 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">Préstamo #{loan.numero_prestamo}</span>
                            <Badge variant={isFinished ? "secondary" : "default"} className="uppercase text-[10px]">
                              {loan.estado}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {loan.fecha_inicio}
                            </span>
                            <span>•</span>
                            <span>{loan.cuotas_totales} cuotas</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{fmt(loan.monto_principal)}</p>
                          {isFinished ? (
                            <p className={`text-[11px] font-bold uppercase tracking-tighter ${mora > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {mora > 0 ? `Finalizado con ${mora} días de mora` : 'Finalizado al día'}
                            </p>
                          ) : (
                            <p className="text-[11px] font-bold text-blue-600 uppercase">
                              {loan.cuotas_pagadas} de {loan.cuotas_totales} cuotas pagas
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Resumen de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end border-b pb-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Prestado</p>
                  <p className="text-xl font-bold">{fmt(loans?.reduce((acc, l) => acc + l.monto_principal, 0) || 0)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-100" />
              </div>
              <div className="flex justify-between items-end border-b pb-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Cobrado</p>
                  <p className="text-xl font-bold text-emerald-600">{fmt(loans?.reduce((acc, l) => acc + l.total_cobrado, 0) || 0)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-100" />
              </div>
              <div className="flex justify-between items-end border-b pb-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-amber-600">{fmt(loans?.reduce((acc, l) => acc + l.total_pendiente, 0) || 0)}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-100" />
              </div>
            </CardContent>
          </Card>

          <Button asChild className="w-full h-12 shadow-lg shadow-blue-600/20">
            <Link href={`/loans/new?borrowerId=${borrower.id}`}>
              Nuevo Préstamo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
