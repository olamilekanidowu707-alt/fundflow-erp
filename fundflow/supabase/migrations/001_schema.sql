-- ============================================================
-- FundFlow ERP — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null check (role in ('staff','manager','finance','admin')),
  department  text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- DEPARTMENTS + BUDGETS
-- ============================================================
create table public.departments (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  monthly_budget numeric(15,2) not null default 0,
  created_at    timestamptz default now()
);

alter table public.departments enable row level security;

create policy "All authenticated users can view departments"
  on public.departments for select using (auth.role() = 'authenticated');

create policy "Admins can manage departments"
  on public.departments for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Insert default departments
insert into public.departments (name, monthly_budget) values
  ('Marketing',  2000000),
  ('Sales',      1500000),
  ('Operations', 3000000),
  ('HR',         800000),
  ('IT',         2500000),
  ('Finance',    1000000),
  ('Admin',      500000);

-- ============================================================
-- FUND REQUESTS
-- ============================================================
create table public.fund_requests (
  id                uuid primary key default uuid_generate_v4(),
  request_number    text unique not null,
  requester_id      uuid not null references public.profiles(id),
  department_id     uuid not null references public.departments(id),
  purpose           text not null,
  description       text,
  amount            numeric(15,2) not null check (amount > 0),
  category          text not null check (category in ('Travel','Marketing','Operations','IT','Training','Entertainment','Procurement','Other')),
  status            text not null default 'pending_manager' check (status in ('pending_manager','approved_manager','approved_finance','rejected','paid')),
  priority          text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  needed_by_date    date,
  manager_id        uuid references public.profiles(id),
  manager_note      text,
  manager_acted_at  timestamptz,
  finance_id        uuid references public.profiles(id),
  finance_note      text,
  finance_acted_at  timestamptz,
  paid_at           timestamptz,
  paid_by           uuid references public.profiles(id),
  payment_reference text,
  attachment_urls   text[],
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.fund_requests enable row level security;

-- Staff can see own requests; managers/finance/admin see all
create policy "Staff see own, others see all"
  on public.fund_requests for select using (
    requester_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('manager','finance','admin'))
  );

create policy "Staff can create requests"
  on public.fund_requests for insert with check (
    auth.uid() = requester_id
  );

create policy "Managers and finance can update"
  on public.fund_requests for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('manager','finance','admin'))
    or requester_id = auth.uid()
  );

-- Auto-increment request number
create or replace function generate_request_number()
returns trigger as $$
declare
  next_num int;
begin
  select coalesce(max(cast(substring(request_number from 5) as int)), 0) + 1
    into next_num from public.fund_requests;
  new.request_number := 'FRQ-' || lpad(next_num::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_request_number
  before insert on public.fund_requests
  for each row execute function generate_request_number();

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger fund_requests_updated_at
  before update on public.fund_requests
  for each row execute function update_updated_at();

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid not null references public.fund_requests(id) on delete cascade,
  actor_id    uuid not null references public.profiles(id),
  action      text not null,
  note        text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "All authenticated users can view audit logs"
  on public.audit_logs for select using (auth.role() = 'authenticated');

create policy "System can insert audit logs"
  on public.audit_logs for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text not null,
  type        text not null check (type in ('info','success','warning','error')),
  read        boolean default false,
  request_id  uuid references public.fund_requests(id) on delete cascade,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on public.notifications for select using (user_id = auth.uid());

create policy "System can create notifications"
  on public.notifications for insert with check (auth.role() = 'authenticated');

create policy "Users can update own notifications"
  on public.notifications for update using (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKET for attachments
-- ============================================================
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);

create policy "Authenticated users can upload"
  on storage.objects for insert with check (
    bucket_id = 'attachments' and auth.role() = 'authenticated'
  );

create policy "Users can view their own attachments"
  on storage.objects for select using (
    bucket_id = 'attachments' and auth.role() = 'authenticated'
  );
