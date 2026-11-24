-- Bribe Desk: run once in a NEW Supabase project (SQL editor). No student data lives here.
-- The browser never reads these tables directly: the server uses the secret key,
-- RLS is on with no policies, so the publishable key can only use Realtime broadcast/presence.

create table if not exists requests (
  id text primary key,
  token_no bigint generated always as identity unique,
  slug text not null unique,
  name text not null,
  title text not null,
  detail text not null default '',
  link text not null default '',
  need text not null default 'whenever' check (need in ('today','tomorrow','week','whenever')),
  private boolean not null default false,
  status text not null default 'issued' check (status in ('issued','tasting','stove','served','bitter')),
  pinned boolean not null default false,
  served_url text not null default '',
  note text not null default '',
  ip_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists offers (
  id text primary key,
  request_id text not null references requests(id) on delete cascade,
  name text not null,
  sweet text not null,
  qty int not null default 1 check (qty between 1 and 20),
  state text not null default 'promised' check (state in ('promised','delivered')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table if not exists board (
  id text primary key,
  no int not null,
  title text not null,
  lane text not null check (lane in ('now','next','later','done')),
  sort int not null default 0
);

create table if not exists work (
  id text primary key,
  title text not null,
  url text not null default '',
  "when" text not null default '',
  blurb text not null default '',
  metric text not null default '',
  hue int not null default 20,
  sort int not null default 0
);

alter table requests enable row level security;
alter table offers enable row level security;
alter table board enable row level security;
alter table work enable row level security;

create index if not exists offers_request on offers(request_id);
create index if not exists requests_ip on requests(ip_hash, created_at);
