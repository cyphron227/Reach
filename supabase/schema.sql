-- Reach Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum for interaction types
create type interaction_type as enum ('call', 'text', 'in_person', 'other');

-- Create enum for catchup frequency
create type catchup_frequency as enum ('weekly', 'biweekly', 'monthly', 'quarterly', 'biannually');

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  onboarding_completed_at timestamp with time zone, -- NULL = onboarding not completed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Connections table (people you want to stay in touch with)
create table public.connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  relationship text,
  catchup_frequency catchup_frequency not null default 'monthly',
  last_interaction_date date,
  next_catchup_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Interactions table (logged interactions with connections)
create table public.interactions (
  id uuid default uuid_generate_v4() primary key,
  connection_id uuid references public.connections on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  interaction_type interaction_type not null,
  memory text,
  interaction_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User settings table (notification preferences)
create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null unique,
  notifications_enabled boolean default true not null,
  notification_time time default '18:00' not null,
  weekly_reflection_enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better query performance
create index connections_user_id_idx on public.connections(user_id);
create index connections_last_interaction_idx on public.connections(last_interaction_date);
create index interactions_connection_id_idx on public.interactions(connection_id);
create index interactions_user_id_idx on public.interactions(user_id);
create index user_settings_user_id_idx on public.user_settings(user_id);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.connections enable row level security;
alter table public.interactions enable row level security;
alter table public.user_settings enable row level security;

-- RLS Policies for users table
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- RLS Policies for connections table
create policy "Users can view own connections"
  on public.connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own connections"
  on public.connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own connections"
  on public.connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own connections"
  on public.connections for delete
  using (auth.uid() = user_id);

-- RLS Policies for interactions table
create policy "Users can view own interactions"
  on public.interactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own interactions"
  on public.interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own interactions"
  on public.interactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own interactions"
  on public.interactions for delete
  using (auth.uid() = user_id);

-- RLS Policies for user_settings table
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger on_users_updated
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger on_connections_updated
  before update on public.connections
  for each row execute procedure public.handle_updated_at();

create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Weekly reflections table (stores completed weekly reflections)
create table public.weekly_reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  week_date date not null, -- Monday of the week
  most_connected_id uuid references public.connections on delete set null,
  grow_closer_id uuid references public.connections on delete set null,
  reflection_notes text,
  grow_closer_followup_date date, -- Set when user follows up with grow_closer person
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for weekly_reflections
create index weekly_reflections_user_id_idx on public.weekly_reflections(user_id);
create index weekly_reflections_week_date_idx on public.weekly_reflections(week_date);
create index weekly_reflections_grow_closer_id_idx on public.weekly_reflections(grow_closer_id);

-- Unique constraint to prevent duplicate reflections for the same week
create unique index weekly_reflections_user_week_unique on public.weekly_reflections(user_id, week_date);

-- Enable Row Level Security for weekly_reflections
alter table public.weekly_reflections enable row level security;

-- RLS Policies for weekly_reflections table
create policy "Users can view own reflections"
  on public.weekly_reflections for select
  using (auth.uid() = user_id);

create policy "Users can insert own reflections"
  on public.weekly_reflections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reflections"
  on public.weekly_reflections for update
  using (auth.uid() = user_id);

create policy "Users can delete own reflections"
  on public.weekly_reflections for delete
  using (auth.uid() = user_id);
