-- Apply to a fresh Supabase project. No destructive reset operations.
create extension if not exists pgcrypto;
create table public.platform_admins(user_id uuid primary key references auth.users(id));
create table public.restaurants(
 id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text not null check(length(name) between 1 and 100), description text not null default '', logo_url text,
 currency text not null default 'SSP' check(currency in ('SSP','USD')), timezone text not null default 'Africa/Juba', opening_info text not null default '',
 active boolean not null default true, ordering_enabled boolean not null default true, next_order_number bigint not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.memberships(restaurant_id uuid references public.restaurants(id),user_id uuid references auth.users(id),role text not null check(role in ('owner','staff')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(restaurant_id,user_id));
create table public.categories(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.restaurants(id),name text not null check(length(name) between 1 and 100),sort_order int not null default 0,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(restaurant_id,id));
create table public.menu_items(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.restaurants(id),category_id uuid not null,name text not null check(length(name) between 1 and 100),description text not null default '',price bigint not null check(price between 0 and 100000000),image_url text,available boolean not null default true,active boolean not null default true,sort_order int not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(restaurant_id,id),foreign key(restaurant_id,category_id) references public.categories(restaurant_id,id));
create table public.restaurant_tables(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.restaurants(id),name text not null check(length(name) between 1 and 50),token text unique not null default encode(gen_random_bytes(24),'hex'),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(restaurant_id,id));
create table public.orders(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.restaurants(id),table_id uuid not null,table_name text not null,number bigint not null,public_token text unique not null default encode(gen_random_bytes(32),'hex'),idempotency_key uuid not null,status text not null default 'new' check(status in ('new','accepted','preparing','ready','served','cancelled')),currency text not null check(currency in ('SSP','USD')),total bigint not null check(total>=0),instructions text not null default '' check(length(instructions)<=500),paid boolean not null default false,bill_status text not null default 'none' check(bill_status in ('none','pending','acknowledged','resolved')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(restaurant_id,id),unique(restaurant_id,number),unique(restaurant_id,idempotency_key),foreign key(restaurant_id,table_id) references public.restaurant_tables(restaurant_id,id));
create table public.order_items(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null,item_id uuid not null,order_id uuid not null,name text not null,unit_price bigint not null check(unit_price>=0),quantity int not null check(quantity between 1 and 20),line_total bigint generated always as (unit_price*quantity) stored,instructions text not null default '' check(length(instructions)<=250),created_at timestamptz not null default now(),foreign key(restaurant_id,item_id) references public.menu_items(restaurant_id,id),foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id));
create table public.order_status_history(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null,order_id uuid not null,status text not null,actor uuid references auth.users(id),at timestamptz not null default now(),foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id));
create table public.payments(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null,order_id uuid not null unique,amount bigint not null check(amount>=0),method text not null check(method in ('cash','mobile_money','other')),actor uuid not null references auth.users(id),created_at timestamptz not null default now(),foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id));
create table public.service_requests(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null,order_id uuid not null,kind text not null default 'bill' check(kind='bill'),status text not null default 'pending' check(status in ('pending','acknowledged','resolved')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id));
create unique index one_open_bill on public.service_requests(order_id) where status!='resolved';
create table public.rate_limits(key text primary key,window_start timestamptz not null,hits int not null);
create index orders_dashboard on public.orders(restaurant_id,status,created_at desc);
create index payments_report on public.payments(restaurant_id,created_at);
create index memberships_user on public.memberships(user_id);
create index items_menu on public.menu_items(restaurant_id,category_id,sort_order);
create index history_order on public.order_status_history(restaurant_id,order_id);
create index lines_order on public.order_items(restaurant_id,order_id);

create function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from platform_admins where user_id=auth.uid())$$;
create function public.is_member(r uuid,owner_only boolean default false) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships m join restaurants t on t.id=m.restaurant_id where m.user_id=auth.uid() and m.restaurant_id=r and t.active and (not owner_only or m.role='owner'))$$;
create function public.public_restaurant(r uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from restaurants where id=r and active)$$;
alter table public.platform_admins enable row level security;
alter table public.restaurants enable row level security;
alter table public.memberships enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.service_requests enable row level security;
alter table public.rate_limits enable row level security;
create policy admin_self on public.platform_admins for select to authenticated using(user_id=auth.uid());
-- restaurants contains only public-facing settings. next_order_number is column-restricted below.
create policy public_restaurants on public.restaurants for select using(active or public.is_platform_admin() or public.is_member(id));
create policy owner_restaurants on public.restaurants for update to authenticated using(public.is_member(id,true) or public.is_platform_admin()) with check(public.is_member(id,true) or public.is_platform_admin());
create policy platform_create on public.restaurants for insert to authenticated with check(public.is_platform_admin());
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid() or public.is_member(restaurant_id,true) or public.is_platform_admin());
-- Membership writes are only through owner/platform RPC, which prevents last-owner removal.
create policy categories_read on public.categories for select using((active and public.public_restaurant(restaurant_id)) or public.is_member(restaurant_id));
create policy categories_owner on public.categories for all to authenticated using(public.is_member(restaurant_id,true)) with check(public.is_member(restaurant_id,true));
create policy items_read on public.menu_items for select using((active and public.public_restaurant(restaurant_id) and exists(select 1 from public.categories c where c.id=category_id and c.active)) or public.is_member(restaurant_id));
create policy items_owner on public.menu_items for all to authenticated using(public.is_member(restaurant_id,true)) with check(public.is_member(restaurant_id,true));
create policy tables_owner on public.restaurant_tables for all to authenticated using(public.is_member(restaurant_id,true)) with check(public.is_member(restaurant_id,true));
create policy tables_staff on public.restaurant_tables for select to authenticated using(public.is_member(restaurant_id));
create policy orders_staff on public.orders for select to authenticated using(public.is_member(restaurant_id));
create policy lines_staff on public.order_items for select to authenticated using(public.is_member(restaurant_id));
create policy history_staff on public.order_status_history for select to authenticated using(public.is_member(restaurant_id));
create policy payments_staff on public.payments for select to authenticated using(public.is_member(restaurant_id));
create policy requests_staff on public.service_requests for select to authenticated using(public.is_member(restaurant_id));
revoke all on all tables in schema public from anon,authenticated;
grant select(id,slug,name,description,logo_url,currency,timezone,opening_info,active,ordering_enabled,created_at,updated_at) on public.restaurants to anon,authenticated;
grant insert(id,slug,name,description,currency,timezone,opening_info,active,ordering_enabled),update(name,description,logo_url,currency,timezone,opening_info,active,ordering_enabled) on public.restaurants to authenticated;
grant select on public.categories,public.menu_items to anon,authenticated;
grant insert,update on public.categories,public.menu_items,public.restaurant_tables to authenticated;
grant select on public.platform_admins,public.memberships,public.restaurant_tables,public.orders,public.order_items,public.order_status_history,public.payments,public.service_requests to authenticated;

create function public.touch_updated() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
do $$declare t text;begin foreach t in array array['restaurants','memberships','categories','menu_items','restaurant_tables','orders','service_requests'] loop execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated()',t);end loop;end$$;
create function public.guard_restaurant() returns trigger language plpgsql set search_path=public as $$begin if new.currency!=old.currency and exists(select 1 from public.orders where restaurant_id=old.id) then raise exception 'Currency cannot change after orders exist';end if; if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone';end if;return new;end$$;
create trigger guard_restaurant before update on public.restaurants for each row execute function public.guard_restaurant();

create function public.place_order(payload jsonb) returns text language plpgsql security definer set search_path=public as $$
declare r restaurants; t restaurant_tables; m menu_items; o orders; line jsonb; total_value bigint:=0; qty int; quantity_sum int:=0; old_token text; category_active boolean;
begin
 select * into r from restaurants where id=(payload->>'restaurant_id')::uuid for update;
 select public_token into old_token from orders where restaurant_id=r.id and idempotency_key=(payload->>'idempotency_key')::uuid;
 if old_token is not null then return old_token;end if;
 if r.id is null or not r.active or not r.ordering_enabled then raise exception 'Restaurant is not accepting orders';end if;
 select * into t from restaurant_tables where restaurant_id=r.id and token=payload->>'table_token' and active for share;
 if t.id is null then raise exception 'Invalid or inactive table';end if;
 if jsonb_typeof(payload->'items')!='array' or jsonb_array_length(payload->'items') not between 1 and 30 or length(coalesce(payload->>'instructions',''))>500 then raise exception 'Invalid cart';end if;
 if (select count(distinct x->>'item_id') from jsonb_array_elements(payload->'items') x)!=jsonb_array_length(payload->'items') then raise exception 'Duplicate items';end if;
 for line in select * from jsonb_array_elements(payload->'items') loop
  qty=(line->>'quantity')::int;
  if qty is null or qty not between 1 and 20 or length(coalesce(line->>'instructions',''))>250 then raise exception 'Invalid item quantity or instructions';end if;
  quantity_sum=quantity_sum+qty;
  select * into m from menu_items where id=(line->>'item_id')::uuid and restaurant_id=r.id for share;
  select active into category_active from categories where id=m.category_id and restaurant_id=r.id for share;
  if m.id is null or not m.active or not m.available or not coalesce(category_active,false) then raise exception 'Item unavailable';end if;
  if m.price is distinct from (line->>'expected_price')::bigint then raise exception 'Prices changed. Review your cart';end if;
  total_value=total_value+m.price*qty;
 end loop;
 if quantity_sum>60 then raise exception 'Maximum 60 items';end if;
 insert into orders(restaurant_id,table_id,table_name,number,idempotency_key,currency,total,instructions) values(r.id,t.id,t.name,r.next_order_number,(payload->>'idempotency_key')::uuid,r.currency,total_value,coalesce(payload->>'instructions','')) returning * into o;
 update restaurants set next_order_number=next_order_number+1 where id=r.id;
 for line in select * from jsonb_array_elements(payload->'items') loop
  select * into m from menu_items where id=(line->>'item_id')::uuid and restaurant_id=r.id;
  insert into order_items(restaurant_id,order_id,item_id,name,unit_price,quantity,instructions) values(r.id,o.id,m.id,m.name,m.price,(line->>'quantity')::int,coalesce(line->>'instructions',''));
 end loop;
 insert into order_status_history(restaurant_id,order_id,status) values(r.id,o.id,'new');return o.public_token;
end$$;
create function public.track_order(tracking_token text) returns jsonb language sql stable security definer set search_path=public as $$select jsonb_build_object('public_token',o.public_token,'number',o.number,'restaurant_id',o.restaurant_id,'table_name',o.table_name,'status',o.status,'paid',o.paid,'total',o.total,'currency',o.currency,'instructions',o.instructions,'bill_status',o.bill_status,'created_at',o.created_at,'items',(select coalesce(jsonb_agg(jsonb_build_object('name',i.name,'unit_price',i.unit_price,'quantity',i.quantity,'line_total',i.line_total,'instructions',i.instructions)),'[]'::jsonb) from order_items i where i.order_id=o.id)) from orders o where o.public_token=tracking_token$$;
create function public.request_bill(tracking_token text) returns void language plpgsql security definer set search_path=public as $$declare o orders;begin select * into o from orders where public_token=tracking_token for update;if o.id is null or o.paid or o.status='cancelled' then raise exception 'Bill unavailable';end if;insert into service_requests(restaurant_id,order_id) values(o.restaurant_id,o.id) on conflict do nothing;update orders set bill_status=case when bill_status='acknowledged' then 'acknowledged' else 'pending' end where id=o.id;end$$;
create function public.operate_order(target_restaurant uuid,target_order uuid,operation text,new_value text) returns void language plpgsql security definer set search_path=public as $$declare o orders;begin
 if not is_member(target_restaurant) then raise exception 'Forbidden';end if;
 select * into o from orders where id=target_order and restaurant_id=target_restaurant for update;if o.id is null then raise exception 'Order not found';end if;
 if operation='status' then
  if not ((o.status='new' and new_value in ('accepted','cancelled')) or (o.status='accepted' and new_value in ('preparing','cancelled')) or (o.status='preparing' and new_value='ready') or (o.status='ready' and new_value='served')) or (new_value='cancelled' and o.paid) then raise exception 'Invalid transition';end if;
  update orders set status=new_value where id=o.id;insert into order_status_history(restaurant_id,order_id,status,actor) values(o.restaurant_id,o.id,new_value,auth.uid());
 elsif operation='payment' then
  if o.paid then return;end if;if o.status='cancelled' or new_value not in ('cash','mobile_money','other') then raise exception 'Invalid payment';end if;
  insert into payments(restaurant_id,order_id,amount,method,actor) values(o.restaurant_id,o.id,o.total,new_value,auth.uid());update orders set paid=true,bill_status='resolved' where id=o.id;update service_requests set status='resolved' where order_id=o.id and status!='resolved';
 elsif operation='bill' then
  if new_value not in ('acknowledged','resolved') or o.bill_status not in ('pending','acknowledged') then raise exception 'Invalid bill operation';end if;
  update orders set bill_status=new_value where id=o.id;update service_requests set status=new_value where order_id=o.id and status!='resolved';
 else raise exception 'Unknown operation';end if;
end$$;
create function public.set_membership(target_restaurant uuid,target_user uuid,new_role text) returns void language plpgsql security definer set search_path=public as $$begin
 if not (is_member(target_restaurant,true) or is_platform_admin()) then raise exception 'Forbidden';end if;
 perform 1 from restaurants where id=target_restaurant for update;
 if new_role not in ('owner','staff','remove') then raise exception 'Invalid role';end if;
 if exists(select 1 from memberships where restaurant_id=target_restaurant and user_id=target_user and role='owner') and new_role!='owner' and (select count(*) from memberships where restaurant_id=target_restaurant and role='owner')<=1 then raise exception 'Keep at least one owner';end if;
 if new_role='remove' then delete from memberships where restaurant_id=target_restaurant and user_id=target_user;else insert into memberships(restaurant_id,user_id,role) values(target_restaurant,target_user,new_role) on conflict(restaurant_id,user_id) do update set role=excluded.role;end if;
end$$;
create function public.consume_rate_limit(rate_key text,max_hits int,window_seconds int) returns boolean language plpgsql security definer set search_path=public as $$declare n int;begin insert into rate_limits(key,window_start,hits) values(rate_key,now(),1) on conflict(key) do update set hits=case when rate_limits.window_start<now()-make_interval(secs=>window_seconds) then 1 else rate_limits.hits+1 end,window_start=case when rate_limits.window_start<now()-make_interval(secs=>window_seconds) then now() else rate_limits.window_start end returning hits into n;return n<=max_hits;end$$;
-- Default function privileges are unsafe for privileged RPCs.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_member(uuid,boolean),public.is_platform_admin(),public.public_restaurant(uuid) to anon,authenticated;
grant execute on function public.operate_order(uuid,uuid,text,text),public.set_membership(uuid,uuid,text) to authenticated;
grant execute on function public.place_order(jsonb),public.track_order(text),public.request_bill(text),public.consume_rate_limit(text,int,int) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('menu-images','menu-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy image_public on storage.objects for select using(bucket_id='menu-images');
create policy image_owner_insert on storage.objects for insert to authenticated with check(bucket_id='menu-images' and public.is_member((storage.foldername(name))[1]::uuid,true));
create policy image_owner_update on storage.objects for update to authenticated using(bucket_id='menu-images' and public.is_member((storage.foldername(name))[1]::uuid,true)) with check(bucket_id='menu-images' and public.is_member((storage.foldername(name))[1]::uuid,true));
create policy image_owner_delete on storage.objects for delete to authenticated using(bucket_id='menu-images' and public.is_member((storage.foldername(name))[1]::uuid,true));
alter publication supabase_realtime add table public.orders;
