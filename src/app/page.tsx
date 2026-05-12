'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Category = 'FF' | 'LO.com' | 'Blog' | 'Pinterest' | 'n8n' | 'Insta' | 'Other';
type Priority = 'high' | 'medium' | 'low';
type Status = 'todo' | 'in-progress' | 'done';

interface Task {
  id: string;
  text: string;
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  notes?: string;
}

interface ExtractedTask {
  text: string;
  category: Category;
  priority: Priority;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  notes?: string;
}

interface DumpResult {
  extracted_tasks: ExtractedTask[];
  summary: string;
}

const CATEGORY_COLORS: Record<Category, string> = {
  FF: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  'LO.com': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  Blog: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  Pinterest: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  n8n: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Insta: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Other: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const CATEGORY_ACTIVE: Record<Category, string> = {
  FF: 'bg-violet-500/30 text-violet-200 border-violet-500/60',
  'LO.com': 'bg-cyan-500/30 text-cyan-200 border-cyan-500/60',
  Blog: 'bg-orange-500/30 text-orange-200 border-orange-500/60',
  Pinterest: 'bg-pink-500/30 text-pink-200 border-pink-500/60',
  n8n: 'bg-blue-500/30 text-blue-200 border-blue-500/60',
  Insta: 'bg-purple-500/30 text-purple-200 border-purple-500/60',
  Other: 'bg-slate-500/30 text-slate-200 border-slate-500/60',
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-green-400',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-green-400',
};

const CATEGORIES: Category[] = ['FF', 'LO.com', 'Blog', 'Pinterest', 'n8n', 'Insta', 'Other'];

export default function Home() {
  const [dumpText, setDumpText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dumpResult, setDumpResult] = useState<DumpResult | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [showDone, setShowDone] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data.tasks);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        processDump();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  async function processDump() {
    if (!dumpText.trim() || isProcessing) return;
    setIsProcessing(true);
    setDumpResult(null);
    setAddedIndices(new Set());
    setError(null);
    try {
      const res = await fetch('/api/process-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dumpText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setDumpResult(data);
    } catch {
      setError('Failed to reach the server. Is the app running?');
    } finally {
      setIsProcessing(false);
    }
  }

  async function addTask(extracted: ExtractedTask, index: number) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: extracted.text,
        category: extracted.category,
        priority: extracted.priority,
        notes: extracted.notes,
      }),
    });
    const newTask: Task = await res.json();
    setTasks((prev) => [...prev, newTask]);
    setAddedIndices((prev) => new Set(Array.from(prev).concat(index)));
  }

  async function addAllTasks() {
    if (!dumpResult) return;
    for (let i = 0; i < dumpResult.extracted_tasks.length; i++) {
      const task = dumpResult.extracted_tasks[i];
      if (!addedIndices.has(i) && !task.is_duplicate) {
        await addTask(task, i);
      }
    }
  }

  async function toggleDone(task: Task) {
    const newStatus: Status = task.status === 'done' ? 'todo' : 'done';
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleVoice() {
    if (isRecording) {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
      setIsRecording(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input requires Chrome or Edge.');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setDumpText((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    textareaRef.current?.focus();
  }

  function clearDump() {
    setDumpText('');
    setDumpResult(null);
    setAddedIndices(new Set());
    setError(null);
    textareaRef.current?.focus();
  }

  const visibleTasks = tasks
    .filter((t) => activeCategory === 'All' || t.category === activeCategory)
    .filter((t) => showDone || t.status !== 'done');

  const byPriority = (p: Priority) => visibleTasks.filter((t) => t.priority === p);
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const pendingCount = tasks.filter((t) => t.status !== 'done').length;

  const newTaskCount = dumpResult
    ? dumpResult.extracted_tasks.filter((t) => !t.is_duplicate).length
    : 0;
  const unadded = newTaskCount - addedIndices.size;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Brain Dump</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {pendingCount} active task{pendingCount !== 1 ? 's' : ''} across {CATEGORIES.length} projects
            </p>
          </div>
          <span className="text-slate-600 text-xs">⌘↵ to process</span>
        </div>

        {/* Dump Zone */}
        <div className="bg-slate-800 rounded-2xl p-5 space-y-3 border border-slate-700">
          <textarea
            ref={textareaRef}
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
            placeholder="What's going on? Working session done, planning session done, random thought, blocker, idea — dump it all here. Don't filter, just spill."
            className="w-full h-44 bg-slate-900 rounded-xl p-4 text-slate-100 placeholder-slate-600 border border-slate-700 focus:border-violet-500 focus:outline-none resize-none text-sm leading-relaxed"
          />

          {error && (
            <p className="text-red-400 text-sm px-1">{error}</p>
          )}

          <div className="flex gap-2.5 items-center">
            <button
              onClick={toggleVoice}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                isRecording
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
              }`}
            >
              <span>{isRecording ? '⏹' : '🎤'}</span>
              {isRecording ? 'Listening…' : 'Voice'}
            </button>

            {(dumpText || dumpResult) && (
              <button
                onClick={clearDump}
                className="px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 border border-slate-600 transition-all"
              >
                Clear
              </button>
            )}

            <button
              onClick={processDump}
              disabled={isProcessing || !dumpText.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all"
            >
              {isProcessing ? (
                <>
                  <span className="inline-block animate-spin">⚙</span>
                  Reading your dump…
                </>
              ) : (
                '✨ Process Dump'
              )}
            </button>
          </div>
        </div>

        {/* Dump Result */}
        {dumpResult && (
          <div className="bg-slate-800 rounded-2xl border border-violet-500/30 overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  {newTaskCount} new task{newTaskCount !== 1 ? 's' : ''} found
                  {dumpResult.extracted_tasks.some((t) => t.is_duplicate) &&
                    ` · ${dumpResult.extracted_tasks.filter((t) => t.is_duplicate).length} already tracked`}
                </p>
                <p className="text-slate-400 text-sm mt-0.5">{dumpResult.summary}</p>
              </div>
              {unadded > 0 && (
                <button
                  onClick={addAllTasks}
                  className="shrink-0 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-semibold text-white transition-all"
                >
                  Add all ({unadded})
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-700/50">
              {dumpResult.extracted_tasks.map((task, i) => {
                const added = addedIndices.has(i);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-5 py-3.5 ${
                      task.is_duplicate ? 'opacity-50' : added ? 'bg-green-500/5' : ''
                    }`}
                  >
                    <span
                      className={`shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-md border font-medium ${CATEGORY_COLORS[task.category]}`}
                    >
                      {task.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm leading-snug">{task.text}</p>
                      {task.notes && (
                        <p className="text-slate-500 text-xs mt-0.5">{task.notes}</p>
                      )}
                      {task.is_duplicate && (
                        <p className="text-amber-400/70 text-xs mt-0.5">Already in your list</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${PRIORITY_LABEL[task.priority]}`}>
                      {task.priority}
                    </span>
                    {!task.is_duplicate && (
                      <button
                        onClick={() => addTask(task, i)}
                        disabled={added}
                        className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                          added
                            ? 'text-green-400 cursor-default'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        {added ? '✓ Added' : '+ Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Task List</h2>
            {doneCount > 0 && (
              <button
                onClick={() => setShowDone((v) => !v)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showDone ? `Hide ${doneCount} done` : `Show ${doneCount} done`}
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeCategory === 'All'
                  ? 'bg-slate-200 text-slate-900 border-slate-200'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  activeCategory === cat ? CATEGORY_ACTIVE[cat] : CATEGORY_COLORS[cat] + ' opacity-60 hover:opacity-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Priority groups */}
          {(['high', 'medium', 'low'] as Priority[]).map((priority) => {
            const group = byPriority(priority);
            if (group.length === 0) return null;
            return (
              <div key={priority} className="space-y-1.5">
                <div className="flex items-center gap-2 pt-1">
                  <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[priority]}`} />
                  <span className={`text-xs font-bold uppercase tracking-widest ${PRIORITY_LABEL[priority]}`}>
                    {priority}
                  </span>
                </div>
                {group.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleDone={toggleDone}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            );
          })}

          {visibleTasks.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <p className="text-4xl mb-3">🧠</p>
              <p className="text-sm">Nothing here. Start a dump!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TaskRow({
  task,
  onToggleDone,
  onDelete,
}: {
  task: Task;
  onToggleDone: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const isDone = task.status === 'done';

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`flex items-start gap-3 px-4 py-3 bg-slate-800 rounded-xl border transition-all ${
        isDone ? 'border-slate-800 opacity-40' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <button
        onClick={() => onToggleDone(task)}
        className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          isDone
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-slate-600 hover:border-violet-400'
        }`}
      >
        {isDone && <span className="text-[9px] leading-none font-bold">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
          {task.text}
        </p>
        {task.status === 'in-progress' && !isDone && (
          <span className="text-xs text-blue-400 mt-0.5 block">In progress</span>
        )}
        {task.notes && !isDone && (
          <p className="text-slate-500 text-xs mt-0.5">{task.notes}</p>
        )}
      </div>

      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-md border font-medium ${CATEGORY_COLORS[task.category]}`}>
        {task.category}
      </span>

      {hovering && (
        <button
          onClick={() => onDelete(task.id)}
          className="shrink-0 text-slate-600 hover:text-red-400 transition-colors text-sm leading-none mt-0.5"
          title="Delete task"
        >
          ✕
        </button>
      )}
    </div>
  );
}
