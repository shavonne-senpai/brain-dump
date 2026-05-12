import fs from "fs";
import path from "path";

/** Step 1: Add new categories here */
export type Category =
  | "FF"
  | "LO.com"
  | "Blog"
  | "Pinterest"
  | "n8n"
  | "Insta"
  | "Other";
export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  text: string;
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  notes?: string;
}

export interface TaskStore {
  tasks: Task[];
  categoryPriorities: Record<Category, Priority>;
  lastUpdated: string;
}

const TASKS_FILE = path.join(process.cwd(), "data", "tasks.json");

export function readTaskStore(): TaskStore {
  const raw = fs.readFileSync(TASKS_FILE, "utf-8");
  return JSON.parse(raw) as TaskStore;
}

export function writeTaskStore(store: TaskStore): void {
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function createTask(data: Omit<Task, "id" | "createdAt">): Task {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
}
