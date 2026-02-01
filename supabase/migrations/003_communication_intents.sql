-- Track communication intents initiated from the app
create table public.communication_intents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  connection_id uuid references public.connections on delete cascade not null,
  method varchar(20) not null check (method in ('call', 'whatsapp', 'text', 'email')),
  initiated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for common queries
create index idx_communication_intents_user_id on public.communication_intents(user_id);
create index idx_communication_intents_connection_id on public.communication_intents(connection_id);
create index idx_communication_intents_initiated_at on public.communication_intents(initiated_at);

-- RLS policies
alter table public.communication_intents enable row level security;

create policy "Users can view own intents"
  on public.communication_intents for select
  using (auth.uid() = user_id);

create policy "Users can insert own intents"
  on public.communication_intents for insert
  with check (auth.uid() = user_id);
