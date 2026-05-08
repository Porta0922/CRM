'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react'
import { PaymentButton } from './PaymentButton'

interface Installment {
  id: string
  borrower_nombre: string
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
}

interface MonthGroup {
  mes_key: string
  total_mes: number
  cuotas_count: number
  cuotas: Installment[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG', maximumFractionDigits: 0
  }).format(n)

export default function CalendarView({ data }: { data: MonthGroup[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl bg-muted/20">
        <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No hay cobros pendientes</h3>
        <p className="text-muted-foreground">Todos los préstamos están al día.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {data.map((group) => (
        <section key={group.mes_key}>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-bold capitalize">
              {new Date(group.mes_key + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{group.cuotas_count} cobros</p>
              <p className="text-lg font-bold text-primary">{fmt(group.total_mes)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.cuotas.map((cuota) => (
              <Card key={cuota.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">{cuota.borrower_nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Cuota {cuota.numero_cuota} • {cuota.fecha_vencimiento}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {fmt(cuota.monto_cuota)}
                    </Badge>
                  </div>
                  <div className="flex justify-end pt-2">
                    <PaymentButton 
                      installmentId={cuota.id}
                      borrowerNombre={cuota.borrower_nombre}
                      monto={fmt(cuota.monto_cuota)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
