create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  role text not null default 'USER' check (role in ('USER','ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  code text primary key,
  name text not null,
  price_php integer not null check (price_php >= 0),
  duration_days integer check (duration_days is null or duration_days > 0),
  included_minutes integer not null check (included_minutes >= 0),
  max_source_minutes integer not null,
  max_clips_per_job integer not null,
  max_queued_jobs integer not null,
  max_active_jobs integer not null,
  max_resolution text not null,
  watermark boolean not null,
  priority integer not null,
  retention_days integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null references public.plans(code),
  status text not null check (status in ('ACTIVE','EXPIRED','CANCELLED')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id,status,period_end desc);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta_minutes integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now(),
  constraint uq_credit_reference unique(user_id,reason,reference_type,reference_id)
);
create index if not exists idx_credit_ledger_user on public.credit_ledger(user_id,created_at desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('URL','UPLOAD')),
  source_url text,
  source_asset_id uuid,
  duration_ms bigint,
  width integer,
  height integer,
  language text,
  status text not null default 'QUEUED' check (status in ('QUEUED','PROCESSING','READY','FAILED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_projects_owner on public.projects(user_id,created_at desc);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  state text not null default 'QUEUED' check (state in ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
  stage text not null default 'INGEST' check (stage in ('INGEST','TRANSCRIBE','ANALYZE','RENDER','FINALIZE')),
  progress integer not null default 0 check(progress between 0 and 100),
  priority integer not null default 100,
  requested_clips integer not null,
  min_clip_seconds integer,
  max_clip_seconds integer,
  aspect_ratio text not null default '9:16',
  captions_enabled boolean not null default true,
  attempt_count integer not null default 0,
  lock_owner text,
  lock_expires_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_jobs_claim on public.processing_jobs(state,priority desc,created_at);
create index if not exists idx_jobs_owner on public.processing_jobs(user_id,created_at desc);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  job_id uuid references public.processing_jobs(id) on delete cascade,
  asset_type text not null,
  r2_key text not null unique,
  mime_type text,
  size_bytes bigint,
  status text not null default 'PENDING' check (status in ('PENDING','READY','DELETED','FAILED')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_media_retention on public.media_assets(status,expires_at);
alter table public.projects drop constraint if exists fk_projects_source_asset;
alter table public.projects add constraint fk_projects_source_asset foreign key(source_asset_id) references public.media_assets(id);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.processing_jobs(id) on delete cascade,
  provider text not null,
  language text,
  raw_text text,
  segments_json jsonb not null,
  provider_request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.clip_candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.processing_jobs(id) on delete cascade,
  start_ms bigint not null,
  end_ms bigint not null,
  title text not null,
  opening_hook text,
  reason text,
  hook_score integer not null,
  clarity_score integer not null,
  payoff_score integer not null,
  emotion_score integer not null,
  novelty_score integer not null,
  clean_cut_score integer not null,
  clip_potential integer not null,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  check(end_ms > start_ms)
);
create index if not exists idx_candidates_job_score on public.clip_candidates(job_id,clip_potential desc);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.processing_jobs(id) on delete cascade,
  candidate_id uuid references public.clip_candidates(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_ms bigint not null,
  end_ms bigint not null,
  clip_potential integer not null,
  status text not null default 'PROCESSING' check (status in ('PROCESSING','READY','FAILED')),
  video_asset_id uuid references public.media_assets(id),
  caption_asset_id uuid references public.media_assets(id),
  thumbnail_asset_id uuid references public.media_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clips_owner on public.clips(user_id,created_at desc);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  account_name text,
  account_number text,
  bank_name text,
  instructions text,
  qr_image_key text,
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.payment_order_sequence;

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null references public.plans(code),
  payment_method_id uuid references public.payment_methods(id),
  amount_php integer not null,
  currency text not null default 'PHP',
  reference_number text,
  receipt_object_key text,
  receipt_mime_type text,
  receipt_size_bytes integer check (receipt_size_bytes is null or receipt_size_bytes between 1 and 5242880),
  status text not null default 'AWAITING_PAYMENT' check (status in ('AWAITING_PAYMENT','PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),
  user_note text,
  admin_note text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payment_requests_owner on public.payment_requests(user_id,created_at desc);
create index if not exists idx_payment_requests_queue on public.payment_requests(status,submitted_at desc);
create unique index if not exists uq_payment_reference_active on public.payment_requests(payment_method_id,reference_number) where reference_number is not null and status in ('PENDING','APPROVED');

alter table public.subscriptions add column if not exists payment_request_id uuid unique references public.payment_requests(id);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

insert into public.plans(code,name,price_php,included_minutes,max_source_minutes,max_clips_per_job,max_queued_jobs,max_active_jobs,max_resolution,watermark,priority,retention_days,active)
values
('FREE','Free',0,30,30,3,1,1,'720p',true,100,7,true),
('CREATOR','Creator',299,500,120,15,3,1,'1080p',false,200,30,true),
('PRO','Pro',599,1200,240,30,5,2,'1080p',false,300,90,true)
on conflict(code) do update set name=excluded.name,price_php=excluded.price_php,included_minutes=excluded.included_minutes,max_source_minutes=excluded.max_source_minutes,max_clips_per_job=excluded.max_clips_per_job,max_queued_jobs=excluded.max_queued_jobs,max_active_jobs=excluded.max_active_jobs,max_resolution=excluded.max_resolution,watermark=excluded.watermark,priority=excluded.priority,retention_days=excluded.retention_days,active=excluded.active,updated_at=now();

update public.plans set duration_days=case when code='FREE' then null else 30 end;

insert into public.payment_methods(code,name,description,enabled,sort_order)
values
('gcash','GCash','Send the exact amount from your GCash wallet.',false,10),
('gotyme','GoTyme','Transfer the exact amount to the configured GoTyme account.',false,20),
('bank_transfer','Bank Transfer','Transfer the exact amount to the configured bank account.',false,30)
on conflict(code) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,display_name)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict(id) do nothing;
  insert into public.credit_ledger(user_id,delta_minutes,balance_after,reason,reference_type,reference_id)
  values(new.id,30,30,'WELCOME_CREDIT','USER',new.id)
  on conflict(user_id,reason,reference_type,reference_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- The trigger only handles future signups. Backfill accounts that existed before
-- this schema was installed so application foreign keys remain valid.
insert into public.profiles(id,email,display_name)
select u.id,coalesce(u.email,u.id::text || '@placeholder.invalid'),coalesce(u.raw_user_meta_data->>'display_name','')
from auth.users u
on conflict(id) do nothing;

insert into public.credit_ledger(user_id,delta_minutes,balance_after,reason,reference_type,reference_id)
select p.id,30,30,'WELCOME_CREDIT','USER',p.id
from public.profiles p
where not exists(select 1 from public.credit_ledger c where c.user_id=p.id)
on conflict(user_id,reason,reference_type,reference_id) do nothing;

create or replace function public.create_project_with_job(
  p_title text,
  p_source_type text,
  p_source_url text,
  p_source_asset_id uuid,
  p_language text,
  p_requested_clips integer,
  p_min_clip_seconds integer,
  p_max_clip_seconds integer
) returns uuid
language plpgsql
security definer set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_project uuid := gen_random_uuid();
  v_plan public.plans%rowtype;
  v_queued integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_source_type not in ('URL','UPLOAD') then raise exception 'Invalid source type'; end if;
  if p_source_type='URL' and (p_source_url is null or p_source_url='') then raise exception 'Source URL required'; end if;
  if p_source_type='UPLOAD' then
    if p_source_asset_id is null then raise exception 'Source asset required'; end if;
    if not exists(select 1 from public.media_assets where id=p_source_asset_id and user_id=v_user and status='READY') then raise exception 'Source asset is not ready'; end if;
  end if;

  select p.* into v_plan from public.plans p
  where p.code = coalesce((
    select s.plan_code from public.subscriptions s
    where s.user_id=v_user and s.status='ACTIVE' and (s.period_end is null or s.period_end>now())
    order by s.period_end desc nulls first limit 1
  ), 'FREE');

  if p_requested_clips > v_plan.max_clips_per_job then raise exception 'Requested clips exceed plan limit'; end if;
  select count(*) into v_queued from public.processing_jobs where user_id=v_user and state in ('QUEUED','RUNNING');
  if v_queued >= v_plan.max_queued_jobs then raise exception 'Your plan queue limit has been reached'; end if;

  insert into public.projects(id,user_id,title,source_type,source_url,source_asset_id,language,status)
  values(v_project,v_user,p_title,p_source_type,p_source_url,p_source_asset_id,nullif(p_language,'auto'),'QUEUED');

  insert into public.processing_jobs(project_id,user_id,state,stage,progress,priority,requested_clips,min_clip_seconds,max_clip_seconds,aspect_ratio,captions_enabled)
  values(v_project,v_user,'QUEUED','INGEST',0,v_plan.priority,p_requested_clips,p_min_clip_seconds,p_max_clip_seconds,'9:16',true);

  if p_source_asset_id is not null then update public.media_assets set project_id=v_project,updated_at=now() where id=p_source_asset_id; end if;
  return v_project;
end;
$$;

create or replace function public.next_payment_order_number()
returns text
language plpgsql
security definer set search_path=public
as $$
begin
  return 'AC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payment_order_sequence')::text, 6, '0');
end;
$$;

create or replace function public.approve_payment_request(
  p_payment_id uuid,
  p_admin_user_id uuid,
  p_admin_note text default null
) returns void
language plpgsql
security definer set search_path=public
as $$
declare
  v_payment public.payment_requests%rowtype;
  v_plan public.plans%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_current_plan text;
  v_balance integer;
begin
  if not exists(select 1 from public.profiles where id=p_admin_user_id and role='ADMIN' and status='ACTIVE') then
    raise exception 'Administrator access required';
  end if;

  select * into v_payment from public.payment_requests where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status <> 'PENDING' then raise exception 'Payment is not pending review'; end if;
  if v_payment.user_id = p_admin_user_id then raise exception 'Administrators cannot approve their own payment'; end if;

  select * into v_plan from public.plans where code=v_payment.plan_code and active=true;
  if not found then raise exception 'Plan not found'; end if;
  if v_plan.duration_days is null or v_plan.duration_days <= 0 then raise exception 'Plan duration is invalid'; end if;
  perform 1 from public.profiles where id=v_payment.user_id for update;

  v_period_start := now();
  select plan_code into v_current_plan from public.subscriptions
  where user_id=v_payment.user_id and status='ACTIVE' and period_end>now()
  order by period_end desc limit 1 for update;

  if v_current_plan = v_payment.plan_code then
    select greatest(coalesce(max(period_end),now()),now()) + make_interval(days=>v_plan.duration_days)
    into v_period_end from public.subscriptions
    where user_id=v_payment.user_id and status='ACTIVE' and plan_code=v_payment.plan_code;
  else
    v_period_end := now() + make_interval(days=>v_plan.duration_days);
  end if;

  update public.payment_requests set status='APPROVED',admin_note=nullif(trim(p_admin_note),''),reviewed_by=p_admin_user_id,reviewed_at=now(),updated_at=now() where id=v_payment.id;
  update public.subscriptions set status=case when period_end<=now() then 'EXPIRED' else 'CANCELLED' end,updated_at=now() where user_id=v_payment.user_id and status='ACTIVE';

  insert into public.subscriptions(user_id,plan_code,payment_request_id,status,period_start,period_end)
  values(v_payment.user_id,v_payment.plan_code,v_payment.id,'ACTIVE',v_period_start,v_period_end);

  select coalesce(sum(delta_minutes),0) + v_plan.included_minutes into v_balance from public.credit_ledger where user_id=v_payment.user_id;
  insert into public.credit_ledger(user_id,delta_minutes,balance_after,reason,reference_type,reference_id)
  values(v_payment.user_id,v_plan.included_minutes,v_balance,'PLAN_GRANT','PAYMENT_REQUEST',v_payment.id)
  on conflict(user_id,reason,reference_type,reference_id) do nothing;

  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details)
  values(p_admin_user_id,'PAYMENT_APPROVED','PAYMENT_REQUEST',v_payment.id,jsonb_build_object('order_number',v_payment.order_number,'plan_code',v_payment.plan_code,'amount_php',v_payment.amount_php));
end;
$$;

create or replace function public.deduct_processing_minutes(p_user_id uuid,p_minutes integer,p_job_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_balance integer;
begin
  if p_minutes <= 0 then raise exception 'Minutes must be positive'; end if;
  perform 1 from public.profiles where id=p_user_id for update;
  select coalesce(sum(delta_minutes),0) into v_balance from public.credit_ledger where user_id=p_user_id;
  if v_balance < p_minutes then raise exception 'Insufficient processing minutes'; end if;
  insert into public.credit_ledger(user_id,delta_minutes,balance_after,reason,reference_type,reference_id)
  values(p_user_id,-p_minutes,v_balance-p_minutes,'CLIP_PROCESSING','PROCESSING_JOB',p_job_id)
  on conflict(user_id,reason,reference_type,reference_id) do nothing;
end;
$$;

create or replace function public.reject_payment_request(
  p_payment_id uuid,
  p_admin_user_id uuid,
  p_reason text,
  p_admin_note text default null
) returns void
language plpgsql
security definer set search_path=public
as $$
declare v_payment public.payment_requests%rowtype;
begin
  if not exists(select 1 from public.profiles where id=p_admin_user_id and role='ADMIN' and status='ACTIVE') then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Rejection reason is required'; end if;
  select * into v_payment from public.payment_requests where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status <> 'PENDING' then raise exception 'Payment is not pending review'; end if;
  if v_payment.user_id = p_admin_user_id then raise exception 'Administrators cannot review their own payment'; end if;
  update public.payment_requests set status='REJECTED',rejection_reason=trim(p_reason),admin_note=nullif(trim(p_admin_note),''),reviewed_by=p_admin_user_id,reviewed_at=now(),updated_at=now() where id=p_payment_id;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details)
  values(p_admin_user_id,'PAYMENT_REJECTED','PAYMENT_REQUEST',p_payment_id,jsonb_build_object('order_number',v_payment.order_number,'reason',trim(p_reason)));
end;
$$;

create or replace function public.claim_next_job(p_worker_id text, p_lock_seconds integer default 300)
returns setof public.processing_jobs
language plpgsql
security definer set search_path=public
as $$
begin
  return query
  with picked as (
    select id from public.processing_jobs
    where state='QUEUED' and (lock_expires_at is null or lock_expires_at<now())
    order by priority desc,created_at
    for update skip locked
    limit 1
  )
  update public.processing_jobs j set state='RUNNING',lock_owner=p_worker_id,lock_expires_at=now()+make_interval(secs=>p_lock_seconds),started_at=coalesce(started_at,now()),attempt_count=attempt_count+1,updated_at=now()
  from picked where j.id=picked.id returning j.*;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.projects enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.media_assets enable row level security;
alter table public.transcripts enable row level security;
alter table public.clip_candidates enable row level security;
alter table public.clips enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payment_requests enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid()=id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
create policy "plans_public_read" on public.plans for select using (active=true);
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid()=user_id);
create policy "credits_select_own" on public.credit_ledger for select using (auth.uid()=user_id);
create policy "projects_select_own" on public.projects for select using (auth.uid()=user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "jobs_select_own" on public.processing_jobs for select using (auth.uid()=user_id);
create policy "assets_select_own" on public.media_assets for select using (auth.uid()=user_id);
create policy "transcripts_select_own" on public.transcripts for select using (exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create policy "candidates_select_own" on public.clip_candidates for select using (exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create policy "clips_select_own" on public.clips for select using (auth.uid()=user_id);
create policy "payment_methods_read_enabled" on public.payment_methods for select using (enabled=true);
create policy "payment_requests_select_own" on public.payment_requests for select using (auth.uid()=user_id);

revoke all on function public.next_payment_order_number() from public,anon,authenticated;
grant execute on function public.next_payment_order_number() to service_role;
revoke all on function public.approve_payment_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.approve_payment_request(uuid,uuid,text) to service_role;
revoke all on function public.reject_payment_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reject_payment_request(uuid,uuid,text,text) to service_role;
revoke all on function public.deduct_processing_minutes(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.deduct_processing_minutes(uuid,integer,uuid) to service_role;
revoke all on function public.claim_next_job(text,integer) from public,anon,authenticated;
grant execute on function public.claim_next_job(text,integer) to service_role;
grant execute on function public.create_project_with_job(text,text,text,uuid,text,integer,integer,integer) to authenticated;

revoke update on public.profiles from authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
