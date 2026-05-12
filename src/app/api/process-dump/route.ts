import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readTaskStore } from '@/lib/tasks';

const client = new Anthropic();

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local' },
      { status: 500 }
    );
  }

  const { dumpText } = await request.json();
  if (!dumpText?.trim()) {
    return NextResponse.json({ error: 'No dump text provided' }, { status: 400 });
  }

  const store = readTaskStore();
  const activeTasks = store.tasks.filter((t) => t.status !== 'done');
  const taskSummary = activeTasks
    .map((t) => `[${t.id}] ${t.category} (${t.priority}): ${t.text}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a personal AI task manager for someone with ADHD who runs a content and tech business.

## Projects & Categories
- **FF** (Forbidden Folio): A dark romance book tracker app — currently working through the home page epic in Linear
- **LO.com**: Main website — needs mobile view fixes (footer too big, odd spacings) and analytics setup
- **Blog**: Content/essay writing with GEO strategy to build authority + Beehiiv email list setup
- **Pinterest**: Pinterest content strategy and pins (new account)
- **n8n**: Automation workflows — blog pin generator in progress, exploring monetization/growth ideas
- **Insta**: Instagram content — static posts and reels (currently LOW priority, not focused here)
- **Other**: Anything that doesn't fit above

## Category Priority Defaults
- HIGH: FF, LO.com
- MEDIUM: Blog, Pinterest, n8n
- LOW: Insta

## Current Active Tasks
${taskSummary || 'No active tasks yet.'}

## Brain Dump to Process
${dumpText}

## Instructions
Extract ALL distinct tasks, ideas, blockers, and to-dos from the dump — even vague ones. For each:
1. Assign the best-fit category
2. Set priority: start from the category default, then bump up if there are urgency signals, bump down if speculative/someday
3. Write a concise task description (max 120 chars) — clear enough to act on later
4. Check if it duplicates or relates to an existing task (match by ID if so)
5. Add a brief note if extra context helps

Return ONLY valid JSON, no markdown fences:
{
  "extracted_tasks": [
    {
      "text": "concise task description",
      "category": "FF",
      "priority": "high",
      "is_duplicate": false,
      "duplicate_of_id": null,
      "notes": "optional context"
    }
  ],
  "summary": "1-2 sentence summary of what was in the dump"
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response from Claude' }, { status: 500 });
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse Claude response as JSON' }, { status: 500 });
  }

  const result = JSON.parse(jsonMatch[0]);
  return NextResponse.json(result);
}
