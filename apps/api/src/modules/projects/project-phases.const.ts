import { TaskPriority } from '@prisma/client';

export const SOFTWARE_PROJECT_PHASES: {
  slug: string;
  name: string;
  sortOrder: number;
  priority: TaskPriority;
}[] = [
  { slug: 'ui-ux', name: 'UI/UX', sortOrder: 1, priority: 'HIGH' },
  { slug: 'frontend', name: 'Frontend', sortOrder: 2, priority: 'HIGH' },
  { slug: 'backend', name: 'Backend', sortOrder: 3, priority: 'HIGH' },
  { slug: 'testing', name: 'Testing', sortOrder: 4, priority: 'MEDIUM' },
  { slug: 'deployment', name: 'Deployment', sortOrder: 5, priority: 'MEDIUM' },
  { slug: 'maintenance', name: 'Maintenance', sortOrder: 6, priority: 'LOW' },
];
