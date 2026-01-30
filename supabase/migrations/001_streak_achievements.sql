-- Streak & Achievement System Migration
-- Run this in your Supabase SQL Editor

-- 1. User streak tracking
create table public.user_streaks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null unique,

  -- Daily interaction streak
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_interaction_date date,
  streak_started_at date,

  -- Weekly streak freeze tracking
  freezes_used_this_week integer not null default 0,
  week_freeze_reset_date date not null default current_date,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Achievement definitions (static reference)
create table public.achievement_definitions (
  id varchar(50) primary key,
  name varchar(100) not null,
  description text not null,
  icon varchar(10) not null,
  category varchar(50) not null,
  threshold_value integer,
  threshold_type varchar(50),
  is_per_contact boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. User achievement progress & unlocks
create table public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  achievement_id varchar(50) references public.achievement_definitions(id) not null,
  connection_id uuid references public.connections on delete cascade,

  -- Progress tracking
  current_progress integer not null default 0,
  is_unlocked boolean not null default false,
  unlocked_at timestamp with time zone,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(user_id, achievement_id, connection_id)
);

-- 4. Connection streak tracking (per-contact cycles)
create table public.connection_streaks (
  id uuid default uuid_generate_v4() primary key,
  connection_id uuid references public.connections on delete cascade not null unique,
  user_id uuid references public.users on delete cascade not null,

  -- Consecutive cycles tracking
  current_cycle_streak integer not null default 0,
  longest_cycle_streak integer not null default 0,
  last_cycle_met_at date,

  -- Historical health tracking (for recovery badges)
  worst_health_reached varchar(20),
  was_ever_wilting boolean default false,
  restored_from_wilting_at date,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Monthly reports (cached for performance)
create table public.monthly_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  report_month date not null,

  -- Snapshot data (JSON for flexibility)
  report_data jsonb not null,

  -- View tracking
  viewed_at timestamp with time zone,

  -- Timestamps
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(user_id, report_month)
);

-- Indexes
create index idx_user_streaks_user_id on public.user_streaks(user_id);
create index idx_user_achievements_user_id on public.user_achievements(user_id);
create index idx_user_achievements_unlocked on public.user_achievements(user_id, is_unlocked);
create index idx_connection_streaks_connection_id on public.connection_streaks(connection_id);
create index idx_connection_streaks_user_id on public.connection_streaks(user_id);
create index idx_monthly_reports_user_month on public.monthly_reports(user_id, report_month);

-- Enable Row Level Security
alter table public.user_streaks enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.connection_streaks enable row level security;
alter table public.monthly_reports enable row level security;

-- RLS Policies for user_streaks
create policy "Users can view own streaks"
  on public.user_streaks for select
  using (auth.uid() = user_id);

create policy "Users can insert own streaks"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own streaks"
  on public.user_streaks for update
  using (auth.uid() = user_id);

-- RLS Policies for achievement_definitions (public read)
create policy "Anyone can view achievement definitions"
  on public.achievement_definitions for select
  using (true);

-- RLS Policies for user_achievements
create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own achievements"
  on public.user_achievements for update
  using (auth.uid() = user_id);

-- RLS Policies for connection_streaks
create policy "Users can view own connection streaks"
  on public.connection_streaks for select
  using (auth.uid() = user_id);

create policy "Users can insert own connection streaks"
  on public.connection_streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own connection streaks"
  on public.connection_streaks for update
  using (auth.uid() = user_id);

-- RLS Policies for monthly_reports
create policy "Users can view own reports"
  on public.monthly_reports for select
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.monthly_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reports"
  on public.monthly_reports for update
  using (auth.uid() = user_id);

-- Triggers for updated_at
create trigger on_user_streaks_updated
  before update on public.user_streaks
  for each row execute procedure public.handle_updated_at();

create trigger on_user_achievements_updated
  before update on public.user_achievements
  for each row execute procedure public.handle_updated_at();

create trigger on_connection_streaks_updated
  before update on public.connection_streaks
  for each row execute procedure public.handle_updated_at();

-- Seed achievement definitions
insert into public.achievement_definitions (id, name, description, icon, category, threshold_value, threshold_type, is_per_contact) values
-- Streak Achievements
('week_warrior', 'Week Warrior', 'Maintained a 7-day connection streak', '🔥', 'streak', 7, 'streak_days', false),
('monthly_maintainer', 'Monthly Maintainer', 'Maintained a 30-day connection streak', '🌟', 'streak', 30, 'streak_days', false),
('quarterly_connector', 'Quarterly Connector', 'Maintained a 90-day connection streak', '💪', 'streak', 90, 'streak_days', false),
('half_year_hero', 'Half-Year Hero', 'Maintained a 180-day connection streak', '🏆', 'streak', 180, 'streak_days', false),
('year_round_friend', 'Year-Round Friend', 'Maintained a 365-day connection streak', '👑', 'streak', 365, 'streak_days', false),

-- Per-Contact Consistency
('on_track', 'On Track', 'Met your connection frequency for 3 consecutive cycles', '🎯', 'consistency', 3, 'cycles', true),
('rhythm_master', 'Rhythm Master', 'Met your connection frequency for 6 consecutive cycles', '🎵', 'consistency', 6, 'cycles', true),
('unbreakable_bond', 'Unbreakable Bond', 'Met your connection frequency for 12 consecutive cycles', '💎', 'consistency', 12, 'cycles', true),

-- Recovery Achievements
('second_chance', 'Second Chance', 'Restored a wilting connection to healthy', '🌱', 'recovery', 1, 'recoveries', false),
('phoenix_rising', 'Phoenix Rising', 'Restored 3 wilting connections in 30 days', '🔥', 'recovery', 3, 'recoveries_30d', false),
('forest_healer', 'Forest Healer', 'Brought forest health from below 50% to above 80%', '🌳', 'recovery', 1, 'forest_recovery', false),

-- Quality Achievements
('quality_time', 'Quality Time', 'Had 5+ in-person interactions in 30 days', '☕', 'quality', 5, 'in_person_30d', false),
('deep_listener', 'Deep Listener', 'Added memory notes to 10+ interactions in 30 days', '📝', 'quality', 10, 'memories_30d', false),
('variety_connector', 'Variety Connector', 'Used all 4 interaction types in 7 days', '🌈', 'quality', 4, 'types_7d', false);
