-- VNPT THU CƯỚC PRO - SUPABASE DATABASE SCHEMA
-- Chạy toàn bộ file này trong Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),

  area text,
  unit_name text,
  dia_ban_c3 text,
  ma_nvtc text,
  collector_name text,

  customer_code text,
  payment_id text,
  phone text,
  address text,
  service_name text,
  management_unit_id text,

  amount_due numeric(14,0) default 0,
  debt_cycle text,

  status text not null default 'Chưa thu'
    check (status in ('Chưa thu', 'Đã thu', 'Hẹn lại', 'Khó thu')),

  note text,
  collected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_owner_idx on public.customers(owner_id);
create index if not exists customers_area_idx on public.customers(area);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists customers_customer_code_idx on public.customers(customer_code);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_payment_id_idx on public.customers(payment_id);

alter table public.customers enable row level security;

drop policy if exists "customers_select_own" on public.customers;
drop policy if exists "customers_insert_own" on public.customers;
drop policy if exists "customers_update_own" on public.customers;
drop policy if exists "customers_delete_own" on public.customers;

create policy "customers_select_own"
on public.customers
for select
to authenticated
using (owner_id = auth.uid());

create policy "customers_insert_own"
on public.customers
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "customers_update_own"
on public.customers
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "customers_delete_own"
on public.customers
for delete
to authenticated
using (owner_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;

create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

-- Gợi ý vận hành:
-- 1. Bật Authentication bằng Email trong Supabase.
-- 2. Tạo tài khoản cho nhân viên.
-- 3. Nếu muốn nhiều nhân viên cùng thấy một kho dữ liệu chung, có thể dùng chung 1 tài khoản nội bộ
--    hoặc nâng cấp thêm bảng teams/roles ở phiên bản sau.
