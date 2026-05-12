/** Step 1: Add new categories to this type */
export type Category = 'FF' | 'LO.com' | 'Blog' | 'Pinterest' | 'n8n' | 'Insta' | 'Other';
export type Priority = 'high' | 'medium' | 'low';
export type Status = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  text: string;
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  notes?: string;
}

/** Step 2: Add default priority for new categories here */
export const CATEGORY_PRIORITIES: Record<Category, Priority> = {
  FF: 'high',
  'LO.com': 'high',
  Blog: 'medium',
  Pinterest: 'medium',
  n8n: 'medium',
  Insta: 'low',
  Other: 'medium',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRow(row: any): Task {
  return {
    id: row.id,
    text: row.text,
    category: row.category,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    notes: row.notes ?? undefined,
  };
}
