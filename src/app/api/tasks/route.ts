import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { mapRow, type Category, type Priority } from '@/lib/tasks';

export async function GET() {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data.map(mapRow) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await getSupabase()
    .from('tasks')
    .insert({
      text: body.text,
      category: body.category as Category,
      priority: body.priority as Priority,
      status: 'todo',
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapRow(data), { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (updates.createdAt) {
    updates.created_at = updates.createdAt;
    delete updates.createdAt;
  }

  const { data, error } = await getSupabase()
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapRow(data));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await getSupabase().from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
