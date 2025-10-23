-- Enable Row Level Security
alter database postgres set "app.jwt_secret" to 'super-secret-jwt-token-with-at-least-32-characters-long';

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- App-specific fields
  lifestyle_preferences jsonb default '{}',
  search_history jsonb default '[]',
  favorite_apps jsonb default '[]',
  onboarding_completed boolean default false
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create search_sessions table for tracking user searches
create table if not exists public.search_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  query text not null,
  results jsonb default '[]',
  filters jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Analytics fields
  session_id text,
  user_agent text,
  ip_address inet
);

-- Enable RLS for search_sessions
alter table public.search_sessions enable row level security;

-- Create policies for search_sessions
create policy "Users can view their own search sessions" on public.search_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own search sessions" on public.search_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own search sessions" on public.search_sessions
  for update using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists search_sessions_user_id_idx on public.search_sessions(user_id);
create index if not exists search_sessions_created_at_idx on public.search_sessions(created_at desc);

-- Create updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Add updated_at trigger to profiles
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();