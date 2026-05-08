-- ============================================================
-- LOAN MANAGEMENT SYSTEM — Schema + RLS
-- Ejecutar en el Editor SQL de Supabase
-- ============================================================

-- ─── 1. PROFILES ────────────────────────────────────────────
create table public.profiles (
  id        uuid references auth.users on delete cascade primary key,
  nombre    text not null,
  email     text not null unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── 2. BORROWERS ───────────────────────────────────────────
create table public.borrowers (
  id         uuid default gen_random_uuid() primary key,
  created_by uuid references public.profiles(id) on delete cascade not null,
  nombre     text not null,
  contacto   text,
  notas      text,
  created_at timestamptz default now()
);

alter table public.borrowers enable row level security;

create policy "Users manage own borrowers"
  on public.borrowers for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);


-- ─── 3. LOANS ───────────────────────────────────────────────
create table public.loans (
  id                     uuid default gen_random_uuid() primary key,
  borrower_id            uuid references public.borrowers(id) on delete cascade not null,
  monto_principal        numeric(14,2) not null check (monto_principal > 0),
  tasa_interes_mensual   numeric(6,4) not null check (tasa_interes_mensual >= 0),
  fecha_inicio           date not null,
  cuotas_totales         integer not null check (cuotas_totales > 0),
  estado                 text not null default 'activo' check (estado in ('activo', 'finalizado')),
  created_at             timestamptz default now()
);

alter table public.loans enable row level security;

-- RLS via borrower ownership
create policy "Users manage own loans"
  on public.loans for all
  using (
    exists (
      select 1 from public.borrowers b
      where b.id = loans.borrower_id
        and b.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.borrowers b
      where b.id = loans.borrower_id
        and b.created_by = auth.uid()
    )
  );


-- ─── 4. INSTALLMENTS ────────────────────────────────────────
create table public.installments (
  id               uuid default gen_random_uuid() primary key,
  loan_id          uuid references public.loans(id) on delete cascade not null,
  numero_cuota     integer not null,
  monto_cuota      numeric(14,2) not null,
  monto_capital    numeric(14,2) not null,
  monto_interes    numeric(14,2) not null,
  saldo_restante   numeric(14,2) not null,
  fecha_vencimiento date not null,
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  fecha_pago       date,
  created_at       timestamptz default now(),
  unique (loan_id, numero_cuota)
);

alter table public.installments enable row level security;

create policy "Users manage own installments"
  on public.installments for all
  using (
    exists (
      select 1 from public.loans l
      join public.borrowers b on b.id = l.borrower_id
      where l.id = installments.loan_id
        and b.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.loans l
      join public.borrowers b on b.id = l.borrower_id
      where l.id = installments.loan_id
        and b.created_by = auth.uid()
    )
  );
