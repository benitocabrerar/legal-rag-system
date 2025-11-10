export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  caseId?: string;
  assignedToId?: string;
  tags: string[];
  reminderDate?: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  checklistItems?: ChecklistItem[];
  history?: TaskHistory[];
  case?: {
    id: string;
    title: string;
    clientName: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  caseId?: string;
  assignedToId?: string;
  tags?: string[];
  reminderDate?: string;
  checklistItems?: Array<{
    title: string;
    position: number;
  }>;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  caseId?: string;
  assignedToId?: string;
  tags?: string[];
  reminderDate?: string;
  isArchived?: boolean;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  caseId?: string;
  assignedToId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  isArchived?: boolean;
}
