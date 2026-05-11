-- ============================================================
-- ACTUALIZACIONES: Nro de Préstamo y Extensión de Pagos
-- ============================================================

-- 1. Agregar número de préstamo auto-incremental
-- Si ya existen registros, se numerarán automáticamente
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS numero_prestamo SERIAL;

-- 2. Actualizar la vista loan_summary para incluir el número
DROP VIEW IF EXISTS public.loan_summary CASCADE;
CREATE OR REPLACE VIEW public.loan_summary AS
SELECT
  l.id,
  l.numero_prestamo, -- Nueva columna
  l.borrower_id,
  b.nombre           AS borrower_nombre,
  b.contacto         AS borrower_contacto,
  b.created_by,
  l.monto_principal,
  l.tasa_interes_mensual,
  l.fecha_inicio,
  l.cuotas_totales,
  l.estado,
  -- Cuotas
  count(i.id)                                         AS cuotas_count,
  count(i.id) filter (where i.estado = 'pagado')      AS cuotas_pagadas,
  count(i.id) filter (where i.estado = 'pendiente')   AS cuotas_pendientes,
  -- Montos
  coalesce(sum(i.monto_cuota), 0)                     AS total_a_pagar,
  coalesce(sum(i.monto_interes), 0)                   AS total_intereses,
  coalesce(sum(i.monto_cuota) filter (where i.estado = 'pagado'), 0) AS total_cobrado,
  coalesce(sum(i.monto_cuota) filter (where i.estado = 'pendiente'), 0) AS total_pendiente,
  -- Próximo vencimiento
  min(i.fecha_vencimiento) filter (where i.estado = 'pendiente') AS proxima_cuota_fecha,
  min(i.monto_cuota) filter (
    where i.estado = 'pendiente'
      and i.fecha_vencimiento = (
        select min(i2.fecha_vencimiento)
        from public.installments i2
        where i2.loan_id = l.id and i2.estado = 'pendiente'
      )
  ) as proxima_cuota_monto
FROM public.loans l
JOIN public.borrowers b ON b.id = l.borrower_id
LEFT JOIN public.installments i ON i.loan_id = l.id
GROUP BY l.id, l.numero_prestamo, b.nombre, b.contacto, b.created_by;

-- 3. Función para extender fecha de vencimiento
CREATE OR REPLACE FUNCTION public.extend_installment_due_date(
  p_installment_id UUID,
  p_days INTEGER DEFAULT 10
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.installments
  SET fecha_vencimiento = fecha_vencimiento + (p_days || ' days')::INTERVAL
  WHERE id = p_installment_id AND estado = 'pendiente';
END;
$$;
