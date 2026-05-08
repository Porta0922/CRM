-- ============================================================
-- FUNCIONES DE NEGOCIO: Pagos y Estados
-- ============================================================

-- ─── 1. Procesar Pago de Cuota ───────────────────────────────
-- Registra el pago y actualiza la fecha de pago
create or replace function public.pay_installment(
  p_installment_id uuid,
  p_fecha_pago date default current_date
)
returns void language plpgsql security definer as $$
begin
  update public.installments
  set 
    estado = 'pagado',
    fecha_pago = p_fecha_pago
  where id = p_installment_id;
end;
$$;


-- ─── 2. Trigger: Auto-finalizar préstamo ────────────────────
-- Se ejecuta después de actualizar una cuota. Si todas están pagadas, cierra el préstamo.
create or replace function public.check_loan_completion()
returns trigger language plpgsql security definer as $$
declare
  v_total_cuotas int;
  v_pagadas_cuotas int;
begin
  -- Contar cuotas del préstamo
  select count(*), count(*) filter (where estado = 'pagado')
  into v_total_cuotas, v_pagadas_cuotas
  from public.installments
  where loan_id = new.loan_id;

  -- Si todas están pagadas, actualizar préstamo
  if v_total_cuotas = v_pagadas_cuotas then
    update public.loans
    set estado = 'finalizado'
    where id = new.loan_id;
  else
    -- Si alguna volvió a pendiente, asegurar que esté activo
    update public.loans
    set estado = 'activo'
    where id = new.loan_id;
  end if;

  return new;
end;
$$;

create trigger tr_check_loan_completion
  after update of estado on public.installments
  for each row
  execute procedure public.check_loan_completion();


-- ─── 3. Función: Dashboard Diario (Opcional para reportes) ────
-- Retorna un JSON con los KPIs del usuario actual
create or replace function public.get_user_kpis()
returns json language plpgsql security definer as $$
declare
  v_result json;
begin
  select row_to_json(d)
  into v_result
  from public.dashboard_kpis d
  where d.created_by = auth.uid();
  
  return coalesce(v_result, '{}'::json);
end;
$$;
