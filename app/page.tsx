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
  Plus, Calendar, ArrowRight, DollarSign, Clock, User
} from 'lucide-react'
import { PaymentButton } from '@/components/PaymentButton'

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-slate-900 text-white pt-12 pb-24 px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-slate-400 mt-2 text-lg">Resumen de tu cartera de préstamos y cobros</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-600/20">
                <Link href="/loans/new">
                  <Plus className="w-5 h-5 mr-2" />
                  Nuevo préstamo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl -mt-16 relative z-20">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            icon={<Wallet className="w-6 h-6" />}
            label="Capital Prestado"
            value={fmt(k.total_capital_prestado)}
            sub={`${k.prestamos_activos} préstamos activos`}
            trend="active"
            color="blue"
          />
          <KpiCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Intereses Proyectados"
            value={fmt(k.total_intereses_proyectados)}
            sub="Ganancia estimada"
            color="indigo"
          />
          <KpiCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Total Cobrado"
            value={fmt(k.total_cobrado)}
            sub="Capital + Intereses"
            color="emerald"
          />
          <KpiCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="Por Cobrar"
            value={fmt(k.total_por_cobrar)}
            sub={k.cuotas_vencidas > 0 ? `${k.cuotas_vencidas} cuotas vencidas` : 'Todo al día'}
            color={k.cuotas_vencidas > 0 ? 'rose' : 'slate'}
            alert={k.cuotas_vencidas > 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          {/* Vencimientos de la semana */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Vencimientos de la semana
              </h2>
            </div>
            
            <Card className="border-none shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardContent className="p-0">
                {!weeklyDue || weeklyDue.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-slate-500 font-medium">¡Sin vencimientos esta semana!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {weeklyDue.map(item => (
                      <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{item.borrower_nombre}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider h-5">
                              Cuota {item.numero_cuota}
                            </Badge>
                            <span className="text-xs text-slate-500">{item.fecha_vencimiento}</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="font-bold text-slate-900">{fmt(item.monto_cuota)}</p>
                            <p className={`text-[11px] font-semibold mt-0.5 ${
                              item.dias_restantes === 0 ? 'text-rose-600' :
                              item.dias_restantes <= 2 ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              {item.dias_restantes === 0 ? 'VENCE HOY' :
                               item.dias_restantes === 1 ? 'VENCE MAÑANA' : `En ${item.dias_restantes} días`}
                            </p>
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
          </div>

          {/* Préstamos activos */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                Préstamos Activos
              </h2>
              <Button variant="link" className="text-blue-600" asChild>
                <Link href="/loans">Ver todos los préstamos</Link>
              </Button>
            </div>

            <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-0">
                {!recentLoans || recentLoans.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-slate-500">No hay préstamos activos en este momento.</p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link href="/loans/new">Crear mi primer préstamo</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentLoans.map(loan => {
                      const pct = Math.round((loan.cuotas_pagadas / loan.cuotas_totales) * 100)
                      return (
                        <Link key={loan.id} href={`/loans/${loan.id}`} className="block p-5 hover:bg-slate-50 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                <User className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{loan.borrower_nombre}</p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {loan.cuotas_pagadas} de {loan.cuotas_totales} cuotas pagadas
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{fmt(loan.monto_principal)}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Capital</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Progreso de cobro</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">Acceso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard href="/calendar" icon={<Calendar className="w-6 h-6" />} label="Calendario" sub="Ver vencimientos" />
            <QuickActionCard href="/borrowers" icon={<User className="w-6 h-6" />} label="Deudores" sub="Gestionar personas" />
            <QuickActionCard href="/loans" icon={<TrendingUp className="w-6 h-6" />} label="Historial" sub="Todos los créditos" />
            <QuickActionCard href="/loans/new" icon={<Plus className="w-6 h-6" />} label="Nuevo" sub="Crear préstamo" />
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color, alert }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    slate: "text-slate-600 bg-slate-50 border-slate-200"
  }

  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-white overflow-hidden group">
      <CardContent className="p-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300 ${colorMap[color]}`}>
          {icon}
        </div>
        <p className="text-slate-400 text-sm font-semibold tracking-wide uppercase">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        <p className={`text-xs mt-2 font-medium ${alert ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
          {sub}
        </p>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ href, icon, label, sub }: any) {
  return (
    <Link href={href}>
      <Card className="border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-sm transition-all text-slate-600 group-hover:text-blue-600">
            {icon}
          </div>
          <p className="font-bold text-slate-900">{label}</p>
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

