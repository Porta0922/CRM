// lib/amortization.ts
// Generador de tabla de amortización — Método Francés (cuota fija)

export interface AmortizationRow {
  numero_cuota: number
  monto_cuota: number
  monto_capital: number
  monto_interes: number
  saldo_restante: number
  fecha_vencimiento: string
}

/**
 * Calcula la tabla de amortización usando Interés Simple.
 * Ideal para préstamos informales de corto plazo (1-3 pagos).
 *
 * @param principal      Monto del préstamo
 * @param tasaMensual    Tasa de interés mensual (ej: 0.05 para 5%)
 * @param cuotas         Número de cuotas (máx 3)
 * @param fechaInicio    Fecha de inicio del préstamo (ISO string)
 */
export function calcularAmortizacion(
  principal: number,
  tasaMensual: number,
  cuotas: number,
  fechaInicio: string
): AmortizationRow[] {
  const tabla: AmortizationRow[] = []
  const fechaBase = new Date(fechaInicio + 'T12:00:00')

  // Interés Simple: El interés se calcula sobre el capital inicial por el tiempo total
  const interesTotal = round2(principal * tasaMensual * cuotas)
  const montoTotal = principal + interesTotal
  const montoCuota = round2(montoTotal / cuotas)

  let capitalRestante = principal
  let interesRestante = interesTotal

  for (let n = 1; n <= cuotas; n++) {
    const fechaVenc = new Date(fechaBase)
    fechaVenc.setMonth(fechaVenc.getMonth() + n)
    const fechaStr = fechaVenc.toISOString().split('T')[0]

    // Distribución proporcional de capital e interés en cada cuota
    let capitalCuota = round2(principal / cuotas)
    let interesCuota = round2(interesTotal / cuotas)

    // Ajuste en la última cuota para evitar errores de redondeo
    if (n === cuotas) {
      capitalCuota = round2(capitalRestante)
      interesCuota = round2(interesRestante)
    }

    const cuotaEfectiva = round2(capitalCuota + interesCuota)
    const saldoRestante = round2((capitalRestante + interesRestante) - cuotaEfectiva)

    tabla.push({
      numero_cuota: n,
      monto_cuota: cuotaEfectiva,
      monto_capital: capitalCuota,
      monto_interes: interesCuota,
      saldo_restante: saldoRestante < 0.01 ? 0 : saldoRestante,
      fecha_vencimiento: fechaStr,
    })

    capitalRestante -= capitalCuota
    interesRestante -= interesCuota
  }

  return tabla
}

/** Resumen financiero del préstamo */
export function calcularResumen(tabla: AmortizationRow[]) {
  const totalPagar = tabla.reduce((s, r) => s + r.monto_cuota, 0)
  const totalIntereses = tabla.reduce((s, r) => s + r.monto_interes, 0)
  const totalCapital = tabla.reduce((s, r) => s + r.monto_capital, 0)
  return {
    cuotaFija: tabla[0]?.monto_cuota ?? 0,
    totalPagar: round2(totalPagar),
    totalIntereses: round2(totalIntereses),
    totalCapital: round2(totalCapital),
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
