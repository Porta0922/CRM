-- ============================================================
-- VIEWS & FUNCTIONS para Dashboard
-- ============================================================

-- ─── Vista: Resumen por préstamo ────────────────────────────
create or replace view public.loan_summary as
select
  l.id,
  l.borrower_id,
  b.nombre           as borrower_nombre,
  b.contacto         as borrower_contacto,
  b.created_by,
  l.monto_principal,
  l.tasa_interes_mensual,
  l.fecha_inicio,
  l.cuotas_totales,
  l.estado,
  -- Cuotas
  count(i.id)                                         as cuotas_count,
  count(i.id) filter (where i.estado = 'pagado')      as cuotas_pagadas,
  count(i.id) filter (where i.estado = 'pendiente')   as cuotas_pendientes,
  -- Montos
  coalesce(sum(i.monto_cuota), 0)                     as total_a_pagar,
  coalesce(sum(i.monto_interes), 0)                   as total_intereses,
  coalesce(sum(i.monto_cuota) filter (where i.estado = 'pagado'), 0) as total_cobrado,
  coalesce(sum(i.monto_cuota) filter (where i.estado = 'pendiente'), 0) as total_pendiente,
  -- Próximo vencimiento
  min(i.fecha_vencimiento) filter (where i.estado = 'pendiente') as proxima_cuota_fecha,
  min(i.monto_cuota) filter (
    where i.estado = 'pendiente'
      and i.fecha_vencimiento = (
        select min(i2.fecha_vencimiento)
        from public.installments i2
        where i2.loan_id = l.id and i2.estado = 'pendiente'
      )
  ) as proxima_cuota_monto
from public.loans l
join public.borrowers b on b.id = l.borrower_id
left join public.installments i on i.loan_id = l.id
group by l.id, b.nombre, b.contacto, b.created_by;

-- RLS en la vista (hereda de las tablas base en Supabase)
-- No necesita política propia, el filtro se aplica al consultar


-- ─── Vista: Vencimientos de la Semana ───────────────────────
create or replace view public.weekly_due as
select
  i.id,
  i.loan_id,
  i.numero_cuota,
  i.monto_cuota,
  i.fecha_vencimiento,
  i.estado,
  l.monto_principal,
  b.nombre   as borrower_nombre,
  b.contacto as borrower_contacto,
  b.created_by,
  -- Días hasta vencimiento
  (i.fecha_vencimiento - current_date) as dias_restantes
from public.installments i
join public.loans l on l.id = i.loan_id
join public.borrowers b on b.id = l.borrower_id
where i.estado = 'pendiente'
  and i.fecha_vencimiento between current_date and (current_date + interval '7 days')
order by i.fecha_vencimiento;


-- ─── Vista: Calendario mensual (pendientes agrupados) ────────
create or replace view public.calendar_monthly as
select
  date_trunc('month', i.fecha_vencimiento)::date  as mes,
  to_char(i.fecha_vencimiento, 'YYYY-MM')         as mes_key,
  count(*)                                        as cuotas_count,
  sum(i.monto_cuota)                              as total_mes,
  b.created_by,
  json_agg(
    json_build_object(
      'id',               i.id,
      'loan_id',          i.loan_id,
      'borrower_nombre',  b.nombre,
      'numero_cuota',     i.numero_cuota,
      'monto_cuota',      i.monto_cuota,
      'fecha_vencimiento', i.fecha_vencimiento
    ) order by i.fecha_vencimiento
  ) as cuotas
from public.installments i
join public.loans l on l.id = i.loan_id
join public.borrowers b on b.id = l.borrower_id
where i.estado = 'pendiente'
group by mes, mes_key, b.created_by
order by mes;


-- ─── Vista: KPIs del Dashboard ──────────────────────────────
create or replace view public.dashboard_kpis as
select
  b.created_by,
  count(distinct l.id)                              as total_prestamos,
  count(distinct l.id) filter (where l.estado = 'activo') as prestamos_activos,
  coalesce(sum(l.monto_principal), 0)               as total_capital_prestado,
  coalesce(sum(i.monto_interes), 0)                 as total_intereses_proyectados,
  coalesce(sum(i.monto_cuota) filter (where i.estado = 'pagado'), 0) as total_cobrado,
  coalesce(sum(i.monto_cuota) filter (where i.estado = 'pendiente'), 0) as total_por_cobrar,
  count(distinct i.id) filter (
    where i.estado = 'pendiente'
      and i.fecha_vencimiento < current_date
  ) as cuotas_vencidas
from public.borrowers b
left join public.loans l on l.borrower_id = b.id
left join public.installments i on i.loan_id = l.id
group by b.created_by;
