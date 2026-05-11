import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Phone, Calendar, DollarSign, CheckCircle, Clock, MessageCircle, Share2, Hash } from 'lucide-react'
import { PaymentButton } from '@/components/PaymentButton'
import { ExtensionButton } from '@/components/ExtensionButton'
import { getWhatsAppLink, WA_MESSAGES } from '@/lib/whatsapp'
import type { Database, LoanSummaryRow } from '@/lib/supabase/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG', maximumFractionDigits: 0
  }).format(n)

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loan } = await supabase
    .from('loan_summary')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!loan) redirect('/loans')

  const { data: installments } = await supabase
    .from('installments')
    .select('*')
    .eq('loan_id', params.id)
    .order('numero_cuota', { ascending: true })

  type Installment = Database['public']['Tables']['installments']['Row']
  const loanData = loan as LoanSummaryRow

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/loans">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Préstamo #{loanData.numero_prestamo}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                loanData.estado === 'activo' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {loanData.estado}
              </span>
            </div>
            <p className="text-muted-foreground">{loanData.borrower_nombre}</p>
          </div>
        </div>
        {loanData.borrower_contacto && (
          <Button className="bg-green-600 hover:bg-green-700 text-white" asChild>
            <a 
              href={getWhatsAppLink(
                loanData.borrower_contacto, 
                WA_MESSAGES.welcome(loanData.borrower_nombre, loanData.numero_prestamo.toString(), loanData.fecha_inicio)
              )} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar Bienvenida
            </a>
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capital</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(loanData.monto_principal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmt(loanData.total_cobrado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{fmt(loanData.total_pendiente)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(installments as Installment[] | null)?.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    inst.estado === 'pagado' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {inst.estado === 'pagado' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium">Cuota {inst.numero_cuota}</p>
                    <p className="text-sm text-muted-foreground">{inst.fecha_vencimiento}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{fmt(inst.monto_cuota)}</p>
                    <p className={`text-[10px] font-bold ${inst.estado === 'pagado' ? 'text-green-600' : 'text-amber-600'}`}>
                      {inst.estado.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inst.estado === 'pendiente' && (
                      <>
                        <ExtensionButton installmentId={inst.id} />
                        {loanData.borrower_contacto && (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 border-green-200 bg-green-50 hover:bg-green-100" asChild>
                            <a 
                              href={getWhatsAppLink(
                                loanData.borrower_contacto, 
                                WA_MESSAGES.reminder(loanData.borrower_nombre, fmt(inst.monto_cuota), inst.fecha_vencimiento)
                              )} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <PaymentButton 
                          installmentId={inst.id}
                          borrowerNombre={loanData.borrower_nombre}
                          borrowerContacto={loanData.borrower_contacto}
                          monto={fmt(inst.monto_cuota)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

