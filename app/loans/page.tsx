import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Plus, Search } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG', maximumFractionDigits: 0
  }).format(n)

import type { Database, LoanSummaryRow } from '@/lib/supabase/types'

export default async function LoansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans } = await supabase
    .from('loan_summary')
    .select('*')
    .eq('created_by', user.id)
    .order('fecha_inicio', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Todos los Préstamos</h1>
        </div>
        <Button asChild>
          <Link href="/loans/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Préstamo
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {!loans || loans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No tienes préstamos registrados.
            </CardContent>
          </Card>
        ) : (
          (loans as LoanSummaryRow[]).map((loan) => (
            <Link key={loan.id} href={`/loans/${loan.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold">
                      {loan.borrower_nombre}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">#{loan.numero_prestamo}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Iniciado el {new Date(loan.fecha_inicio).toLocaleDateString('es-PY')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{fmt(loan.monto_principal)}</p>
                    <Badge variant={loan.estado === 'activo' ? 'default' : 'secondary'}>
                      {loan.estado}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
