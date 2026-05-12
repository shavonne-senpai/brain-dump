import { NextResponse } from 'next/server';
import { readTaskStore, writeTaskStore, createTask, type Category, type Priority, type Status } from '@/lib/tasks';

export async function GET() {
  const store = readTaskStore();
  return NextResponse.json(store);
}

export async function POST(request: Request) {
  const body = await request.json();
  const store = readTaskStore();
  const newTask = createTask({
    text: body.text,
    category: body.category as Category,
    priority: body.priority as Priority,
    status: 'todo' as Status,
    notes: body.notes,
  });
  store.tasks.push(newTask);
  writeTaskStore(store);
  return NextResponse.json(newTask, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const store = readTaskStore();
  const idx = store.tasks.findIndex((t) => t.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  store.tasks[idx] = { ...store.tasks[idx], ...body };
  writeTaskStore(store);
  return NextResponse.json(store.tasks[idx]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const store = readTaskStore();
  store.tasks = store.tasks.filter((t) => t.id !== id);
  writeTaskStore(store);
  return NextResponse.json({ success: true });
}
