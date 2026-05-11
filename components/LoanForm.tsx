'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcularAmortizacion, calcularResumen } from '@/lib/amortization'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Calculator, CheckCircle, MessageCircle } from 'lucide-react'
import { getWhatsAppLink, WA_MESSAGES } from '@/lib/whatsapp'

interface Borrower {
  id: string
  nombre: string
  contacto: string | null
}

interface LoanFormProps {
  borrowers: Borrower[]
  userId: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n)

export default function LoanForm({ borrowers, userId }: LoanFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdLoanNumber, setCreatedLoanNumber] = useState<number | null>(null)

  // Formulario
  const [borrowerId, setBorrowerId] = useState('')
  const [principal, setPrincipal] = useState('')
  const [tasa, setTasa] = useState('')
  const [cuotas, setCuotas] = useState('')
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Nuevo deudor inline
  const [newBorrower, setNewBorrower] = useState({ nombre: '', contacto: '', notas: '' })
  const [showNewBorrower, setShowNewBorrower] = useState(false)
  const [creatingBorrower, setCreatingBorrower] = useState(false)

  // Preview de amortización
  const tabla = (() => {
    const p = parseFloat(principal)
    const t = parseFloat(tasa) / 100
    const n = parseInt(cuotas)
    if (p > 0 && t >= 0 && n > 0 && fechaInicio) {
      return calcularAmortizacion(p, t, n, fechaInicio)
    }
    return null
  })()

  const resumen = tabla ? calcularResumen(tabla) : null

  async function handleCreateBorrower() {
    if (!newBorrower.nombre.trim()) return
    setCreatingBorrower(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('borrowers')
      .insert({ created_by: userId, ...newBorrower })
      .select('id, nombre, contacto')
      .single()

    if (error) {
      setError('Error al crear el deudor: ' + error.message)
    } else {
      setBorrowerId(data.id)
      setShowNewBorrower(false)
      setNewBorrower({ nombre: '', contacto: '', notas: '' })
      router.refresh()
    }
    setCreatingBorrower(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tabla || !borrowerId) {
      setError('Completá todos los campos y revisá la tabla de cuotas.')
      return
    }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      // 1. Insertar préstamo
      const { data: loan, error: loanErr } = await supabase
        .from('loans')
        .insert({
          borrower_id: borrowerId,
          monto_principal: parseFloat(principal),
          tasa_interes_mensual: parseFloat(tasa) / 100,
          fecha_inicio: fechaInicio,
          cuotas_totales: parseInt(cuotas),
          estado: 'activo',
        })
        .select('id, numero_prestamo')
        .single()

      if (loanErr || !loan) {
        setError('Error al guardar el préstamo: ' + loanErr?.message)
        return
      }

      setCreatedLoanNumber(loan.numero_prestamo)

      // 2. Insertar cuotas en batch
      const installments = tabla.map(row => ({
        loan_id: loan.id,
        numero_cuota: row.numero_cuota,
        monto_cuota: row.monto_cuota,
        monto_capital: row.monto_capital,
        monto_interes: row.monto_interes,
        saldo_restante: row.saldo_restante,
        fecha_vencimiento: row.fecha_vencimiento,
        estado: 'pendiente' as const,
      }))

      const { error: instErr } = await supabase
        .from('installments')
        .insert(installments)

      if (instErr) {
        setError('Error al guardar las cuotas: ' + instErr.message)
        // Rollback manual: eliminar el préstamo creado
        await supabase.from('loans').delete().eq('id', loan.id)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/'), 1500)
    })
  }

  if (success) {
    const selectedB = borrowers.find(b => b.id === borrowerId)
    return (
      <Card className="max-w-md mx-auto mt-16 text-center p-8 border-none shadow-2xl bg-white/80 backdrop-blur-sm">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold mb-2">¡Préstamo creado con éxito!</CardTitle>
        <CardDescription className="text-slate-500 mb-8">
          El plan de pagos ha sido generado correctamente.
        </CardDescription>
        
        <div className="space-y-3">
          {selectedB?.contacto && (
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-6" asChild>
              <a 
                href={getWhatsAppLink(
                  selectedB.contacto, 
                  WA_MESSAGES.welcome(selectedB.nombre, createdLoanNumber?.toString() || 'NUEVO', fechaInicio)
                )} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Enviar bienvenida por WhatsApp
              </a>
            </Button>
          )}
          <Button variant="outline" className="w-full py-6" onClick={() => router.push('/')}>
            Ir al Dashboard
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Datos del préstamo ── */}
          <Card>
            <CardHeader>
              <CardTitle>Datos del Préstamo</CardTitle>
              <CardDescription>Completá los campos para generar el plan de pagos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deudor */}
              <div className="space-y-2">
                <Label>Deudor</Label>
                <div className="flex gap-2">
                  <Select value={borrowerId} onValueChange={setBorrowerId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar deudor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {borrowers.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nombre} {b.contacto ? `— ${b.contacto}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewBorrower(!showNewBorrower)}
                  >
                    + Nuevo
                  </Button>
                </div>

                {/* Formulario nuevo deudor inline */}
                {showNewBorrower && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <p className="text-sm font-medium">Nuevo deudor</p>
                    <Input
                      placeholder="Nombre completo *"
                      value={newBorrower.nombre}
                      onChange={e => setNewBorrower(p => ({ ...p, nombre: e.target.value }))}
                    />
                    <Input
                      placeholder="Teléfono / email"
                      value={newBorrower.contacto}
                      onChange={e => setNewBorrower(p => ({ ...p, contacto: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Notas opcionales"
                      rows={2}
                      value={newBorrower.notas}
                      onChange={e => setNewBorrower(p => ({ ...p, notas: e.target.value }))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateBorrower}
                      disabled={creatingBorrower || !newBorrower.nombre}
                    >
                      {creatingBorrower ? 'Guardando...' : 'Crear deudor'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Monto */}
              <div className="space-y-2">
                <Label htmlFor="principal">Monto del préstamo (₲)</Label>
                <Input
                  id="principal"
                  type="number"
                  placeholder="ej: 5000000"
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  min="1"
                  required
                />
              </div>

              {/* Tasa */}
              <div className="space-y-2">
                <Label htmlFor="tasa">
                  Tasa de interés mensual (%)
                  <span className="text-muted-foreground text-xs ml-2">ej: 5 = 5% mensual</span>
                </Label>
                <Input
                  id="tasa"
                  type="number"
                  step="0.01"
                  placeholder="ej: 5"
                  value={tasa}
                  onChange={e => setTasa(e.target.value)}
                  min="0"
                  required
                />
              </div>

              {/* Cuotas */}
              <div className="space-y-2">
                <Label htmlFor="cuotas">Cantidad de cuotas (Máx 3)</Label>
                <Select value={cuotas} onValueChange={setCuotas}>
                  <SelectTrigger id="cuotas">
                    <SelectValue placeholder="Seleccionar cuotas..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Cuota (30 días)</SelectItem>
                    <SelectItem value="2">2 Cuotas (60 días)</SelectItem>
                    <SelectItem value="3">3 Cuotas (90 días)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de inicio</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Resumen financiero ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Resumen Financiero</CardTitle>
              </div>
              <CardDescription>Calculado en tiempo real — Interés Simple</CardDescription>
            </CardHeader>
            <CardContent>
              {resumen ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Cuota mensual</p>
                      <p className="text-xl font-bold tabular-nums">{fmt(resumen.cuotaFija)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total a pagar</p>
                      <p className="text-xl font-bold tabular-nums">{fmt(resumen.totalPagar)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Capital prestado</p>
                      <p className="text-lg font-semibold tabular-nums">{fmt(resumen.totalCapital)}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Intereses totales</p>
                      <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                        {fmt(resumen.totalIntereses)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Costo total del préstamo: </span>
                    {((resumen.totalIntereses / parseFloat(principal)) * 100).toFixed(1)}% sobre el capital
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Completá los campos para ver el resumen
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tabla de amortización ── */}
        {tabla && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Plan de Pagos</CardTitle>
              <CardDescription>
                {tabla.length} cuotas — primera: {tabla[0]?.fecha_vencimiento}
                {' '}— última: {tabla[tabla.length - 1]?.fecha_vencimiento}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabla.map(row => (
                      <TableRow key={row.numero_cuota}>
                        <TableCell className="font-mono text-muted-foreground">
                          {row.numero_cuota}
                        </TableCell>
                        <TableCell>{row.fecha_vencimiento}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {fmt(row.monto_cuota)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-blue-600 dark:text-blue-400">
                          {fmt(row.monto_capital)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                          {fmt(row.monto_interes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {fmt(row.saldo_restante)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Errores y submit ── */}
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 mt-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending || !tabla || !borrowerId}
            className="min-w-36"
          >
            {isPending ? 'Guardando...' : `Crear préstamo (${tabla?.length ?? 0} cuotas)`}
          </Button>
        </div>
      </form>
    </div>
  )
}
