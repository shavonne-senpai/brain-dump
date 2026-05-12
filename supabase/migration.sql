-- Run this in your Supabase SQL editor

create table if not exists tasks (
  id          uuid        primary key default gen_random_uuid(),
  text        text        not null,
  category    text        not null,
  priority    text        not null check (priority in ('high', 'medium', 'low')),
  status      text        not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  created_at  timestamptz not null default now(),
  notes       text
);

-- Disable RLS (personal tool, no auth needed)
alter table tasks disable row level security;

-- Seed initial tasks
insert into tasks (text, category, priority, status) values
  ('Continue working through Linear tickets in home page epic', 'FF',        'high',   'in-progress'),
  ('Fix mobile view: footer too big and odd spacings',          'LO.com',    'high',   'todo'),
  ('Set up analytics for LO.com',                              'LO.com',    'high',   'todo'),
  ('Write more essays with GEO in mind to establish authority', 'Blog',      'medium', 'todo'),
  ('Figure out Beehiiv situation to get API key for LO.com email list', 'Blog', 'medium', 'todo'),
  ('Figure out Pinterest strategy for new account',            'Pinterest', 'medium', 'todo'),
  ('Create more pins for other essays',                        'Pinterest', 'medium', 'todo'),
  ('Finish blog pin generator n8n automation',                 'n8n',       'medium', 'in-progress'),
  ('Go through list of automation ideas for monetization, growth, and fun', 'n8n', 'medium', 'todo'),
  ('Make more static posts for Instagram',                     'Insta',     'low',    'todo'),
  ('Make more reels for Instagram',                            'Insta',     'low',    'todo');
