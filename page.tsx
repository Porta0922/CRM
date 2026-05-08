// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  TrendingUp, Wallet, AlertTriangle, CheckCircle,
  Plus, Calendar, ArrowRight, DollarSign, Clock
} from 'lucide-react'
import { PaymentButton } from './PaymentButton'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG', maximumFractionDigits: 0
  }).format(n)

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // KPIs
  const { data: kpis } = await supabase
    .from('dashboard_kpis')
    .select('*')
    .eq('created_by', user.id)
    .single()

  // Vencimientos de la semana
  const { data: weeklyDue } = await supabase
    .from('weekly_due')
    .select('*')
    .eq('created_by', user.id)
    .order('fecha_vencimiento')

  // Últimos préstamos activos
  const { data: recentLoans } = await supabase
    .from('loan_summary')
    .select('*')
    .eq('created_by', user.id)
    .eq('estado', 'activo')
    .order('proxima_cuota_fecha', { ascending: true })
    .limit(5)

  const k = kpis ?? {
    total_prestamos: 0, prestamos_activos: 0,
    total_capital_prestado: 0, total_intereses_proyectados: 0,
    total_cobrado: 0, total_por_cobrar: 0, cuotas_vencidas: 0
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu cartera de préstamos</p>
        </div>
        <Button asChild>
          <Link href="/loans/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo préstamo
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Wallet className="w-5 h-5" />}
          label="Capital prestado"
          value={fmt(k.total_capital_prestado)}
          sub={`${k.prestamos_activos} activos`}
          color="blue"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Intereses proyectados"
          value={fmt(k.total_intereses_proyectados)}
          sub="sobre préstamos activos"
          color="amber"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Total cobrado"
          value={fmt(k.total_cobrado)}
          sub="en cuotas pagadas"
          color="green"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Por cobrar"
          value={fmt(k.total_por_cobrar)}
          sub={k.cuotas_vencidas > 0 ? `⚠ ${k.cuotas_vencidas} vencidas` : 'sin vencidos'}
          color={k.cuotas_vencidas > 0 ? 'red' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Vencimientos de la semana */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vencimientos esta semana</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!weeklyDue || weeklyDue.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                Sin vencimientos esta semana
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyDue.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm
                      ${item.dias_restantes === 0
                        ? 'border-red-200 bg-red-50 dark:bg-red-950/30'
                        : item.dias_restantes <= 2
                        ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/30'
                        : 'border-border bg-muted/30'
                      }`}
                  >
                    <div>
                      <p className="font-medium">{item.borrower_nombre}</p>
                      <p className="text-muted-foreground text-xs">
                        Cuota {item.numero_cuota} — {item.fecha_vencimiento}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{fmt(item.monto_cuota)}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            item.dias_restantes === 0 ? 'text-red-600 border-red-300' :
                            item.dias_restantes <= 2 ? 'text-amber-600 border-amber-300' :
                            'text-muted-foreground'
                          }`}
                        >
                          {item.dias_restantes === 0 ? 'Hoy' :
                            item.dias_restantes === 1 ? 'Mañana' :
                            `en ${item.dias_restantes}d`}
                        </Badge>
                      </div>
                      <PaymentButton 
                        installmentId={item.id} 
                        borrowerNombre={item.borrower_nombre}
                        monto={fmt(item.monto_cuota)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Préstamos activos */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Préstamos activos</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/loans">
                  Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!recentLoans || recentLoans.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <p>No hay préstamos activos</p>
                <Button asChild className="mt-3" size="sm" variant="outline">
                  <Link href="/loans/new">
                    <Plus className="w-4 h-4 mr-1" /> Crear primer préstamo
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLoans.map(loan => {
                  const pct = Math.round((loan.cuotas_pagadas / loan.cuotas_totales) * 100)
                  return (
                    <Link
                      key={loan.id}
                      href={`/loans/${loan.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{loan.borrower_nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {loan.cuotas_pagadas}/{loan.cuotas_totales} cuotas
                            {loan.proxima_cuota_fecha && ` — próx: ${loan.proxima_cuota_fecha}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">
                            {fmt(loan.monto_principal)}
                          </p>
                          <p className="text-xs text-muted-foreground">capital</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{pct}% cobrado</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: '/calendar', icon: <Calendar className="w-4 h-4" />, label: 'Calendario de cuotas' },
          { href: '/borrowers', icon: <Wallet className="w-4 h-4" />, label: 'Mis deudores' },
          { href: '/loans', icon: <TrendingUp className="w-4 h-4" />, label: 'Todos los préstamos' },
        ].map(item => (
          <Button key={item.href} variant="outline" className="h-auto py-3 justify-start" asChild>
            <Link href={item.href}>
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}

function KpiCard({
  icon, label, value, sub, color = 'default'
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color?: 'blue' | 'amber' | 'green' | 'red' | 'default'
}) {
  const colors = {
    blue:    'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    amber:   'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    green:   'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
    red:     'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
    default: 'text-muted-foreground bg-muted',
  }
  return (
    <Card>
      <CardContent className="pt-5">
        <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>
          {icon}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
