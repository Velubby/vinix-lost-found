do $$
begin
  create type public.report_type as enum ('hilang', 'temuan');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_status as enum ('draf', 'aktif', 'ditemukan', 'klaim', 'selesai');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.claim_status as enum ('diajukan', 'ditinjau', 'disetujui', 'ditolak');
exception
  when duplicate_object then null;
end $$;

-- Profiles: karyawan (default) and admin
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  department text,
  employee_id text,
  role text not null default 'karyawan' check (role in ('karyawan', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  location text not null,
  found_at timestamptz not null,
  image_url text,
  diterima_di_pos boolean default false,
  description text not null,
  status text not null default 'Ditemukan',
  source_report_id uuid unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.report_type not null,
  item_title text not null,
  category text not null,
  location text not null,
  incident_at timestamptz not null,
  public_description text not null,
  private_description text,
  image_url text,
  image_urls text[],
  diterima_di_pos boolean default false,
  contact_phone text not null,
  status public.report_status not null default 'aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  private_answers text not null,
  contact_phone text not null,
  status public.claim_status not null default 'diajukan',
  ticket_code text not null unique,
  pickup_location text,
  pickup_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  title text not null,
  description text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Compatibility alters for existing/new-project application in order
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists employee_id text;
alter table public.profiles add column if not exists role text not null default 'karyawan';
alter table public.reports add column if not exists image_url text;
alter table public.reports add column if not exists image_urls text[];
alter table public.reports add column if not exists diterima_di_pos boolean default false;
alter table public.claims alter column report_id drop not null;
alter table public.claims add column if not exists pickup_location text;
alter table public.claims add column if not exists pickup_at timestamptz;
alter table public.claims add column if not exists approved_at timestamptz;
alter table public.items add column if not exists source_report_id uuid unique;
alter table public.items add column if not exists diterima_di_pos boolean default false;
alter table public.items drop column if exists private_notes;
alter table public.items drop constraint if exists items_source_report_id_fkey;
alter table public.items add constraint items_source_report_id_fkey
  foreign key (source_report_id) references public.reports(id) on delete set null;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.reports enable row level security;
alter table public.claims enable row level security;
alter table public.report_events enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

drop policy if exists "Profiles are visible to their owner" on public.profiles;
drop policy if exists "Users can create their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;
drop policy if exists "Staff can view profiles" on public.profiles;
drop policy if exists "Anyone can browse found items" on public.items;
drop policy if exists "Authenticated users can browse found items" on public.items;
drop policy if exists "Users can create found items" on public.items;
drop policy if exists "Staff can update items" on public.items;
drop policy if exists "Users can view their reports" on public.reports;
drop policy if exists "Users can create their reports" on public.reports;
drop policy if exists "Users can update their reports" on public.reports;
drop policy if exists "Users can delete their draft reports" on public.reports;
drop policy if exists "Staff can view reports" on public.reports;
drop policy if exists "Users can view their claims" on public.claims;
drop policy if exists "Users can create their claims" on public.claims;
drop policy if exists "Report and item owners can view claims" on public.claims;
drop policy if exists "Staff can view and update claims" on public.claims;
drop policy if exists "Staff can update claims" on public.claims;
drop policy if exists "Users can view events for their reports" on public.report_events;

create policy "Profiles are visible to their owner"
  on public.profiles for select using (auth.uid() = id or public.is_staff());
create policy "Users can create their profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Anyone can browse found items"
  on public.items for select to anon, authenticated using (
    public.is_staff()
    or diterima_di_pos = true
    or auth.uid() = created_by
  );
create policy "Staff can update items"
  on public.items for update using (public.is_staff()) with check (public.is_staff());

create policy "Users can view their reports"
  on public.reports for select using (auth.uid() = user_id or public.is_staff());
create policy "Users can create their reports"
  on public.reports for insert with check (auth.uid() = user_id);
create policy "Users can update their reports"
  on public.reports for update using (
    public.is_staff()
    or (auth.uid() = user_id and status = 'draf')
  ) with check (public.is_staff() or auth.uid() = user_id);
create policy "Users can delete their draft reports"
  on public.reports for delete using (auth.uid() = user_id and status = 'draf');

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public item images are viewable" on storage.objects;
drop policy if exists "Users can upload item images" on storage.objects;
drop policy if exists "Users can update their item images" on storage.objects;
drop policy if exists "Users can delete their item images" on storage.objects;

create policy "Public item images are viewable"
  on storage.objects for select using (bucket_id = 'item-images');
create policy "Users can upload item images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their item images"
  on storage.objects for update to authenticated
  using (bucket_id = 'item-images' and owner_id = auth.uid()::text);
create policy "Users can delete their item images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and owner_id = auth.uid()::text);

create policy "Report and item owners can view claims"
  on public.claims for select using (
    auth.uid() = user_id
    or public.is_staff()
    or exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.created_by = auth.uid()
    )
    or exists (
      select 1 from public.reports
      where reports.id = claims.report_id
        and reports.user_id = auth.uid()
    )
  );
create policy "Users can create their claims"
  on public.claims for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.diterima_di_pos = true
        and items.status not in ('Menunggu Penyerahan', 'Klaim Disetujui', 'Selesai')
    )
  );
create policy "Staff can update claims"
  on public.claims for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create or replace function public.schedule_claim(
  claim_id uuid,
  requested_pickup_at timestamptz
)
returns public.claims
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_claim public.claims;
begin
  update public.claims
  set pickup_at = requested_pickup_at
  where id = claim_id
    and user_id = auth.uid()
    and status = 'disetujui'
  returning * into updated_claim;

  if updated_claim.id is null then
    raise exception 'Klaim tidak ditemukan atau belum disetujui';
  end if;

  return updated_claim;
end;
$$;

grant execute on function public.schedule_claim(uuid, timestamptz) to authenticated;

create policy "Users can view events for their reports"
  on public.report_events for select using (
    public.is_staff()
    or
    exists (
      select 1 from public.reports
      where reports.id = report_events.report_id
        and reports.user_id = auth.uid()
    )
  );

-- Auto-create employee profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, department, employee_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Karyawan'),
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    nullif(new.raw_user_meta_data ->> 'employee_id', ''),
    'karyawan'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.profiles.phone),
    department = coalesce(excluded.department, public.profiles.department),
    employee_id = coalesce(excluded.employee_id, public.profiles.employee_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.publish_found_report()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type = 'temuan' then
    insert into public.items (
      title, category, location, found_at, image_url, description,
      status, source_report_id, created_by
    )
    values (
      new.item_title, new.category, new.location, new.incident_at,
      new.image_url, new.public_description,
      'Menunggu Penyerahan', new.id, new.user_id
    )
    on conflict (source_report_id) do update set
      title = excluded.title,
      category = excluded.category,
      location = excluded.location,
      found_at = excluded.found_at,
      image_url = excluded.image_url,
      description = excluded.description,
      status = 'Menunggu Penyerahan',
      diterima_di_pos = false;
  end if;
  return new;
end;
$$;

drop trigger if exists on_found_report_created on public.reports;
create trigger on_found_report_created
after insert on public.reports
for each row execute procedure public.publish_found_report();

create or replace function public.record_report_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.report_events (report_id, title, description, created_by)
  values (new.id, 'Laporan dibuat', 'Laporan berhasil diterima sistem.', new.user_id);
  return new;
end;
$$;

drop trigger if exists on_report_created_event on public.reports;
create trigger on_report_created_event
after insert on public.reports
for each row execute procedure public.record_report_created();

create or replace function public.handle_claim_submitted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  found_report_id uuid;
begin
  update public.items
  set status = 'Menunggu Verifikasi'
  where id = new.item_id;

  select source_report_id
    into found_report_id
  from public.items
  where id = new.item_id;

  if found_report_id is not null then
    update public.reports
    set status = 'klaim', updated_at = now()
    where id = found_report_id;

    insert into public.report_events (report_id, title, description, created_by)
    values (
      found_report_id,
      'Klaim diajukan',
      'Ada pengguna yang mengajukan klaim kepemilikan. Admin perlu memverifikasi ciri privatnya.',
      new.user_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_claim_submitted on public.claims;
create trigger on_claim_submitted
after insert on public.claims
for each row execute procedure public.handle_claim_submitted();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute procedure public.set_updated_at();

drop trigger if exists set_claims_updated_at on public.claims;
create trigger set_claims_updated_at
before update on public.claims
for each row execute procedure public.set_updated_at();

-- pickup_at records the physical handover, so updated_at can no longer stand in
-- for the approval time once an item is handed over.
create or replace function public.set_claim_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'disetujui' and new.approved_at is null then
    new.approved_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_claims_approved_at on public.claims;
create trigger set_claims_approved_at
before update on public.claims
for each row execute procedure public.set_claim_approved_at();

create or replace function public.sync_found_report_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type = 'temuan' then
    update public.items
    set title = new.item_title,
        category = new.category,
        location = new.location,
        found_at = new.incident_at,
        image_url = new.image_url,
        description = new.public_description,
        diterima_di_pos = new.diterima_di_pos,
        status = case
          when new.status = 'klaim' then 'Menunggu Verifikasi'
          when new.status = 'selesai' then 'Selesai'
          when new.diterima_di_pos = true then 'Ditemukan'
          else status
        end
    where source_report_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_found_report_updated on public.reports;
create trigger on_found_report_updated
after update on public.reports
for each row execute procedure public.sync_found_report_update();

create or replace function public.handle_claim_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  found_report_id uuid;
  next_item_status text;
  next_report_status public.report_status;
begin
  if new.status = old.status then
    return new;
  end if;

  select source_report_id
    into found_report_id
  from public.items
  where id = new.item_id;

  -- Update the report first so its sync trigger runs before the final item
  -- status is written below. Approval keeps the report in "klaim" until the
  -- handover action closes it, so "disetujui" never means "already picked up".
  if found_report_id is not null then
    next_report_status := case new.status
      when 'disetujui' then 'klaim'
      when 'ditolak' then 'ditemukan'
      else 'klaim'
    end;

    update public.reports
    set status = next_report_status
    where id = found_report_id;

    insert into public.report_events (report_id, title, description, created_by)
    values (
      found_report_id,
      case new.status
        when 'disetujui' then 'Klaim disetujui'
        when 'ditolak' then 'Klaim ditolak'
        else 'Klaim sedang ditinjau'
      end,
      case new.status
        when 'disetujui' then 'Klaim kepemilikan disetujui. Barang menunggu diambil pemilik pada jam kerja kantor.'
        when 'ditolak' then 'Klaim kepemilikan ditolak. Barang kembali tersedia di katalog.'
        else 'Petugas sedang memeriksa ciri kepemilikan.'
      end,
      new.user_id
    );
  end if;

  next_item_status := case new.status
    when 'diajukan' then 'Menunggu Verifikasi'
    when 'ditinjau' then 'Menunggu Verifikasi'
    when 'disetujui' then 'Klaim Disetujui'
    when 'ditolak' then 'Ditemukan'
  end;

  update public.items
  set status = next_item_status
  where id = new.item_id;

  return new;
end;
$$;

drop trigger if exists on_claim_updated on public.claims;
create trigger on_claim_updated
after update on public.claims
for each row execute procedure public.handle_claim_updated();

create or replace function public.remove_found_item_after_report_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.items where source_report_id = old.id;
  return old;
end;
$$;

drop trigger if exists on_found_report_deleted on public.reports;
create trigger on_found_report_deleted
after delete on public.reports
for each row execute procedure public.remove_found_item_after_report_delete();

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text check (type in ('report', 'claim', 'pickup', 'system')),
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their notifications" on public.notifications;
drop policy if exists "Users can update their notifications" on public.notifications;

create policy "Users can view their notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update their notifications"
  on public.notifications for update using (auth.uid() = user_id);

create or replace function public.notify_report_status_changed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  report_owner uuid;
  notif_type text;
  notif_title text;
  notif_body text;
  notif_link text;
begin
  if old.status is distinct from new.status then
    select user_id into report_owner from public.reports where id = new.id;

    notif_type := 'report';
    notif_link := '/lacak?report=' || new.id;

    if new.status = 'ditemukan' then
      notif_title := 'Laporan Diterima';
      notif_body := 'Laporan barang yang kamu ajukan telah diterima dan sedang ditinjau.';
    elsif new.status = 'klaim' then
      notif_title := 'Ada Klaim Barang';
      notif_body := 'Seseorang mengajukan klaim pada laporan barang temuanmu.';
    elsif new.status = 'selesai' then
      notif_title := 'Laporan Selesai';
      notif_body := 'Laporan kamu telah ditandai selesai. Terima kasih telah melaporkan.';
    elsif new.status = 'aktif' then
      notif_title := 'Laporan Aktif';
      notif_body := 'Laporan kamu sudah aktif dan tersedia di katalog pencarian.';
    else
      return new;
    end if;

    insert into public.notifications (user_id, title, body, type, link)
    values (report_owner, notif_title, notif_body, notif_type, notif_link);
  end if;
  return new;
end;
$$;

drop trigger if exists on_notify_report_status_changed on public.reports;
create trigger on_notify_report_status_changed
after update on public.reports
for each row execute procedure public.notify_report_status_changed();

create or replace function public.notify_claim_status_changed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  claim_owner uuid;
  report_owner uuid;
  source_report uuid;
  notif_title text;
  notif_body text;
  notif_link text;
begin
  if new.status = old.status then
    return new;
  end if;

  claim_owner := new.user_id;

  if new.status = 'disetujui' then
    notif_title := 'Klaim Disetujui';
    notif_body := 'Klaim barang temuanmu telah disetujui. Lokasi pengambilan: ' || coalesce(new.pickup_location, '-');
    notif_link := '/lacak?ticket=' || new.ticket_code;
    insert into public.notifications (user_id, title, body, type, link)
    values (claim_owner, notif_title, notif_body, 'claim', notif_link);
  elsif new.status = 'ditolak' then
    notif_title := 'Klaim Ditolak';
    notif_body := 'Klaim barang temuanmu ditolak oleh admin.';
    notif_link := '/lacak?ticket=' || new.ticket_code;
    insert into public.notifications (user_id, title, body, type, link)
    values (claim_owner, notif_title, notif_body, 'claim', notif_link);
  end if;

  select items.source_report_id into source_report
  from public.items
  where items.id = new.item_id;

  if source_report is not null then
    select reports.user_id into report_owner
    from public.reports
    where reports.id = source_report;
  end if;

  if report_owner is not null and report_owner <> claim_owner then
    if new.status = 'disetujui' then
      notif_title := 'Klaim Barang Temuanmu Disetujui';
      notif_body := 'Seseorang mengklaim barang temuanmu dan klaimnya telah disetujui admin.';
      notif_link := '/lacak?ticket=' || new.ticket_code;
      insert into public.notifications (user_id, title, body, type, link)
      values (report_owner, notif_title, notif_body, 'claim', notif_link);
    elsif new.status = 'ditolak' then
      notif_title := 'Klaim Barang Temuanmu Ditolak';
      notif_body := 'Klaim atas barang temuanmu ditolak oleh admin.';
      notif_link := '/lacak?ticket=' || new.ticket_code;
      insert into public.notifications (user_id, title, body, type, link)
      values (report_owner, notif_title, notif_body, 'claim', notif_link);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_notify_claim_status_changed on public.claims;
create trigger on_notify_claim_status_changed
after update on public.claims
for each row execute procedure public.notify_claim_status_changed();