-- Safe to run more than once. This repairs Auth accounts created before the
-- profile-creation trigger was installed.
insert into public.profiles(id,email,display_name)
select u.id,coalesce(u.email,u.id::text || '@placeholder.invalid'),coalesce(u.raw_user_meta_data->>'display_name','')
from auth.users u
on conflict(id) do nothing;

insert into public.credit_ledger(user_id,delta_minutes,balance_after,reason,reference_type,reference_id)
select p.id,30,30,'WELCOME_CREDIT','USER',p.id
from public.profiles p
where not exists(select 1 from public.credit_ledger c where c.user_id=p.id)
on conflict(user_id,reason,reference_type,reference_id) do nothing;

notify pgrst, 'reload schema';
