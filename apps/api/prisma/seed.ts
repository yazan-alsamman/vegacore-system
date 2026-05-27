import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'Super Admin', slug: 'super-admin', description: 'Full system access' },
  { name: 'General Manager', slug: 'general-manager', description: 'Operations oversight' },
  { name: 'Project Manager', slug: 'project-manager', description: 'Project management' },
  { name: 'Developer', slug: 'developer', description: 'Development team' },
  { name: 'Marketing Manager', slug: 'marketing-manager', description: 'Marketing operations' },
  { name: 'Photographer', slug: 'photographer', description: 'Media production' },
  { name: 'Video Editor', slug: 'video-editor', description: 'Video editing' },
  { name: 'Model', slug: 'model', description: 'Model management' },
  { name: 'Accountant', slug: 'accountant', description: 'Financial management' },
  { name: 'Client', slug: 'client', description: 'Client portal access' },
];

const PERMISSIONS = [
  { name: 'Read Dashboard', slug: 'dashboard.read', module: 'dashboard', action: 'read' },
  { name: 'Read Users', slug: 'users.read', module: 'users', action: 'read' },
  { name: 'Create Users', slug: 'users.create', module: 'users', action: 'create' },
  { name: 'Update Users', slug: 'users.update', module: 'users', action: 'update' },
  { name: 'Delete Users', slug: 'users.delete', module: 'users', action: 'delete' },
  { name: 'Read RBAC', slug: 'rbac.read', module: 'rbac', action: 'read' },
  { name: 'Manage RBAC', slug: 'rbac.manage', module: 'rbac', action: 'manage' },
  { name: 'Read Clients', slug: 'clients.read', module: 'clients', action: 'read' },
  { name: 'Create Clients', slug: 'clients.create', module: 'clients', action: 'create' },
  { name: 'Update Clients', slug: 'clients.update', module: 'clients', action: 'update' },
  { name: 'Delete Clients', slug: 'clients.delete', module: 'clients', action: 'delete' },
  { name: 'Read Projects', slug: 'projects.read', module: 'projects', action: 'read' },
  { name: 'Create Projects', slug: 'projects.create', module: 'projects', action: 'create' },
  { name: 'Update Projects', slug: 'projects.update', module: 'projects', action: 'update' },
  { name: 'Delete Projects', slug: 'projects.delete', module: 'projects', action: 'delete' },
  { name: 'Read Tasks', slug: 'tasks.read', module: 'tasks', action: 'read' },
  { name: 'Create Tasks', slug: 'tasks.create', module: 'tasks', action: 'create' },
  { name: 'Update Tasks', slug: 'tasks.update', module: 'tasks', action: 'update' },
  { name: 'Delete Tasks', slug: 'tasks.delete', module: 'tasks', action: 'delete' },
  { name: 'Read Marketing', slug: 'marketing.read', module: 'marketing', action: 'read' },
  { name: 'Create Marketing', slug: 'marketing.create', module: 'marketing', action: 'create' },
  { name: 'Update Marketing', slug: 'marketing.update', module: 'marketing', action: 'update' },
  { name: 'Delete Marketing', slug: 'marketing.delete', module: 'marketing', action: 'delete' },
  { name: 'Read Media', slug: 'media.read', module: 'media', action: 'read' },
  { name: 'Create Media', slug: 'media.create', module: 'media', action: 'create' },
  { name: 'Update Media', slug: 'media.update', module: 'media', action: 'update' },
  { name: 'Delete Media', slug: 'media.delete', module: 'media', action: 'delete' },
  { name: 'Read Models', slug: 'models.read', module: 'models', action: 'read' },
  { name: 'Create Models', slug: 'models.create', module: 'models', action: 'create' },
  { name: 'Update Models', slug: 'models.update', module: 'models', action: 'update' },
  { name: 'Delete Models', slug: 'models.delete', module: 'models', action: 'delete' },
  { name: 'Read HR', slug: 'hr.read', module: 'hr', action: 'read' },
  { name: 'Create HR', slug: 'hr.create', module: 'hr', action: 'create' },
  { name: 'Update HR', slug: 'hr.update', module: 'hr', action: 'update' },
  { name: 'Delete HR', slug: 'hr.delete', module: 'hr', action: 'delete' },
  { name: 'Manage HR', slug: 'hr.manage', module: 'hr', action: 'manage' },
  { name: 'Read Finance', slug: 'finance.read', module: 'finance', action: 'read' },
  { name: 'Create Finance', slug: 'finance.create', module: 'finance', action: 'create' },
  { name: 'Update Finance', slug: 'finance.update', module: 'finance', action: 'update' },
  { name: 'Delete Finance', slug: 'finance.delete', module: 'finance', action: 'delete' },
  { name: 'Read Archive', slug: 'archive.read', module: 'archive', action: 'read' },
  { name: 'Create Archive', slug: 'archive.create', module: 'archive', action: 'create' },
  { name: 'Update Archive', slug: 'archive.update', module: 'archive', action: 'update' },
  { name: 'Delete Archive', slug: 'archive.delete', module: 'archive', action: 'delete' },
  { name: 'Use AI', slug: 'ai.use', module: 'ai', action: 'use' },
  { name: 'Read AI', slug: 'ai.read', module: 'ai', action: 'read' },
  { name: 'Manage AI', slug: 'ai.manage', module: 'ai', action: 'manage' },
  { name: 'Read Audit', slug: 'audit.read', module: 'audit', action: 'read' },
  { name: 'Read Security', slug: 'security.read', module: 'security', action: 'read' },
  { name: 'Create Security', slug: 'security.create', module: 'security', action: 'create' },
  { name: 'Update Security', slug: 'security.update', module: 'security', action: 'update' },
  { name: 'Delete Security', slug: 'security.delete', module: 'security', action: 'delete' },
  { name: 'Read Chat', slug: 'chat.read', module: 'chat', action: 'read' },
  { name: 'Use Chat', slug: 'chat.use', module: 'chat', action: 'use' },
  { name: 'Read Reports', slug: 'reports.read', module: 'reports', action: 'read' },
  { name: 'Generate Reports', slug: 'reports.generate', module: 'reports', action: 'generate' },
  { name: 'Read Calendar', slug: 'calendar.read', module: 'calendar', action: 'read' },
];

/** Role → permission slugs. Principle: least privilege — each role sees only their domain. */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super-admin': PERMISSIONS.map((p) => p.slug),
  'general-manager': [
    'dashboard.read', 'users.read', 'clients.read', 'clients.create', 'clients.update',
    'projects.read', 'projects.create', 'projects.update', 'tasks.read', 'tasks.create', 'tasks.update',
    'marketing.read', 'marketing.create', 'marketing.update', 'media.read', 'media.create',
    'models.read', 'hr.read', 'hr.manage', 'finance.read', 'archive.read', 'ai.use', 'ai.read', 'audit.read',
    'chat.read', 'chat.use',
    'reports.read', 'reports.generate',
    'calendar.read',
  ],
  /** Project management only */
  'project-manager': [
    'dashboard.read',
    'clients.read',
    'projects.read', 'projects.create', 'projects.update', 'projects.delete',
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
    'archive.read',
    'chat.read', 'chat.use',
    'reports.read', 'reports.generate',
    'calendar.read',
  ],
  /** Development & security only */
  'developer': [
    'projects.read',
    'tasks.read', 'tasks.update',
    'security.read', 'security.create', 'security.update',
    'ai.use',
    'chat.read', 'chat.use',
    'calendar.read',
  ],
  /** Marketing: clients, social, packages, files, models, content & shoots */
  'marketing-manager': [
    'dashboard.read',
    'clients.read',
    'clients.update',
    'marketing.read',
    'marketing.create',
    'marketing.update',
    'marketing.delete',
    'media.read',
    'media.create',
    'media.update',
    'models.read',
    'models.update',
    'ai.use',
    'chat.read',
    'chat.use',
    'calendar.read',
  ],
  /** Photography / shoots only */
  'photographer': [
    'media.read', 'media.create', 'media.update',
    'chat.read', 'chat.use',
    'calendar.read',
  ],
  /** Reels & video editing */
  'video-editor': [
    'marketing.read', 'marketing.update',
    'media.read', 'media.update',
    'chat.read', 'chat.use',
    'calendar.read',
  ],
  /** Model schedule & profile only */
  'model': [
    'models.read',
    'chat.read', 'chat.use',
    'calendar.read',
  ],
  /** Finance only */
  'accountant': [
    'finance.read', 'finance.create', 'finance.update', 'finance.delete',
    'chat.read', 'chat.use',
    'reports.read', 'reports.generate',
    'calendar.read',
  ],
  'client': ['projects.read', 'tasks.read'],
};

async function main() {
  console.log('Seeding VegaCore OS...');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: { ...role, isSystem: true },
    });
  }

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const permMap = Object.fromEntries(permissions.map((p) => [p.slug, p.id]));

  for (const role of roles) {
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const slugs =
      role.slug === 'super-admin'
        ? permissions.map((p) => p.slug)
        : ROLE_PERMISSIONS[role.slug] || [];
    for (const slug of slugs) {
      const permissionId = permMap[slug];
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          update: {},
          create: { roleId: role.id, permissionId },
        });
      }
    }
  }

  const adminRole = roles.find((r) => r.slug === 'super-admin')!;
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@vegasystem.local' },
    update: {},
    create: {
      email: 'admin@vegasystem.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: adminRole.id,
      locale: 'en',
    },
  });

  const gmRole = roles.find((r) => r.slug === 'general-manager')!;
  await prisma.user.upsert({
    where: { email: 'manager@vegasystem.local' },
    update: {},
    create: {
      email: 'manager@vegasystem.local',
      passwordHash: await bcrypt.hash('Manager@123', 12),
      firstName: 'General',
      lastName: 'Manager',
      roleId: gmRole.id,
    },
  });

  const pmRole = roles.find((r) => r.slug === 'project-manager')!;
  await prisma.user.upsert({
    where: { email: 'pm@vegasystem.local' },
    update: { roleId: pmRole.id },
    create: {
      email: 'pm@vegasystem.local',
      passwordHash: await bcrypt.hash('Pm@123', 12),
      firstName: 'Project',
      lastName: 'Manager',
      roleId: pmRole.id,
    },
  });

  const mktRole = roles.find((r) => r.slug === 'marketing-manager')!;
  await prisma.user.upsert({
    where: { email: 'marketing@vegasystem.local' },
    update: { roleId: mktRole.id },
    create: {
      email: 'marketing@vegasystem.local',
      passwordHash: await bcrypt.hash('Marketing@123', 12),
      firstName: 'Marketing',
      lastName: 'Lead',
      roleId: mktRole.id,
    },
  });

  const photoRole = roles.find((r) => r.slug === 'photographer')!;
  await prisma.user.upsert({
    where: { email: 'photo@vegasystem.local' },
    update: { roleId: photoRole.id },
    create: {
      email: 'photo@vegasystem.local',
      passwordHash: await bcrypt.hash('Photo@123', 12),
      firstName: 'Studio',
      lastName: 'Photographer',
      roleId: photoRole.id,
    },
  });

  const editorRole = roles.find((r) => r.slug === 'video-editor')!;
  await prisma.user.upsert({
    where: { email: 'editor@vegasystem.local' },
    update: { roleId: editorRole.id },
    create: {
      email: 'editor@vegasystem.local',
      passwordHash: await bcrypt.hash('Editor@123', 12),
      firstName: 'Video',
      lastName: 'Editor',
      roleId: editorRole.id,
    },
  });

  const accRole = roles.find((r) => r.slug === 'accountant')!;
  await prisma.user.upsert({
    where: { email: 'accountant@vegasystem.local' },
    update: { roleId: accRole.id },
    create: {
      email: 'accountant@vegasystem.local',
      passwordHash: await bcrypt.hash('Accountant@123', 12),
      firstName: 'Finance',
      lastName: 'Accountant',
      roleId: accRole.id,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      companyName: 'Demo Corp',
      ownerName: 'John Demo',
      email: 'demo@democorp.com',
      phone: '+1234567890',
      country: 'UAE',
      businessType: 'Technology',
      status: 'ACTIVE',
      onboardingDate: new Date(),
    },
  });

  await prisma.clientPackage.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      clientId: client.id,
      name: 'Premium Package',
      packageType: 'annual',
      subscribedServices: ['social', 'design', 'development', 'hosting'],
      reelsQuota: 12,
      designQuota: 20,
      visitsQuota: 6,
      developmentHours: 80,
      hostingType: 'VPS',
      contractStart: new Date(),
      contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.client.update({
    where: { id: client.id },
    data: {
      socialLinks: {
        instagram: '@democorp',
        linkedin: 'linkedin.com/company/democorp',
        website: 'https://democorp.com',
      },
    },
  });

  const timelineCount = await prisma.clientTimeline.count({ where: { clientId: client.id } });
  if (timelineCount === 0) {
    await prisma.clientTimeline.createMany({
      data: [
        { clientId: client.id, type: 'note', title: 'Kickoff meeting completed', content: 'Aligned on Q1 deliverables' },
        { clientId: client.id, type: 'message', title: 'WhatsApp follow-up', content: 'Client confirmed brand colors' },
      ],
    });
  }

  await prisma.asset.createMany({
    data: [
      {
        clientId: client.id,
        name: 'Service Agreement 2026',
        type: 'CONTRACT',
        fileUrl: '/files/demo-contract.pdf',
        description: 'Master service agreement signed Jan 2026',
        tags: ['contract', 'legal', '2026'],
        version: 2,
      },
      {
        clientId: client.id,
        name: 'Brand Guidelines',
        type: 'BRANDING',
        fileUrl: '/files/demo-brand.pdf',
        description: 'Full brand book — colors, typography, usage',
        tags: ['design', 'branding', 'guidelines'],
      },
      {
        clientId: client.id,
        name: 'Logo Pack',
        type: 'LOGO',
        fileUrl: '/files/demo-logo.zip',
        tags: ['design', 'logo'],
      },
      {
        clientId: client.id,
        name: 'Homepage UI Kit v3',
        type: 'DESIGN',
        fileUrl: '/files/demo-ui-kit.fig',
        description: 'Figma source — homepage redesign',
        tags: ['design', 'figma', 'ui'],
      },
      {
        clientId: client.id,
        name: 'Instagram credentials',
        type: 'CREDENTIAL',
        fileUrl: '#',
        tags: ['credentials', 'social'],
        metadata: { platform: 'instagram', username: 'democorp', notes: 'Stored securely' },
      },
      {
        clientId: client.id,
        name: 'democorp.com',
        type: 'DOMAIN',
        fileUrl: '#',
        tags: ['domain', 'infrastructure'],
        metadata: { registrar: 'Namecheap', expiresAt: '2027-01-15', dns: 'Cloudflare' },
      },
      {
        clientId: client.id,
        name: 'Production VPS',
        type: 'HOSTING',
        fileUrl: '#',
        tags: ['hosting', 'infrastructure'],
        metadata: { provider: 'DigitalOcean', ip: '192.0.2.1', panel: 'cPanel' },
      },
      {
        clientId: client.id,
        name: 'Product shoot — Jan',
        type: 'MEDIA',
        fileUrl: '/files/demo-shoot.zip',
        tags: ['media', 'photo', '2026'],
      },
      {
        clientId: client.id,
        name: 'Brand reel — final cut',
        type: 'VIDEO',
        fileUrl: '/files/demo-reel-final.mp4',
        mimeType: 'video/mp4',
        tags: ['video', 'reel', 'media'],
        metadata: { duration: 45, platform: 'Instagram' },
      },
      {
        clientId: client.id,
        name: 'WhatsApp thread export — Q1',
        type: 'CONVERSATION',
        fileUrl: '/files/demo-whatsapp-export.txt',
        description: 'Archived client communication Q1 2026',
        tags: ['conversation', 'whatsapp', 'client-comms'],
      },
      {
        clientId: client.id,
        name: 'VegaCore OS v1.0.0',
        type: 'RELEASE',
        fileUrl: '/releases/vegasystem-1.0.0.zip',
        description: 'Production release — initial launch',
        tags: ['release', 'software', 'v1.0.0'],
        metadata: { version: '1.0.0', changelog: 'Initial VegaCore OS release', environment: 'production' },
      },
    ],
  });

  const contractAsset = await prisma.asset.findFirst({
    where: { clientId: client.id, name: 'Service Agreement 2026' },
  });
  if (contractAsset) {
    await prisma.assetVersion.createMany({
      data: [
        { assetId: contractAsset.id, version: 1, fileUrl: '/files/demo-contract-v1.pdf', notes: 'Draft signed' },
        { assetId: contractAsset.id, version: 2, fileUrl: '/files/demo-contract.pdf', notes: 'Final signed copy' },
      ],
    });
  }

  await prisma.contract.create({
    data: {
      clientId: client.id,
      title: 'Annual marketing retainer',
      fileUrl: '/files/demo-retainer-contract.pdf',
      value: 60000,
      status: 'active',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  await prisma.subscription.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      clientId: client.id,
      name: 'Annual retainer',
      amount: 5000,
      interval: 'monthly',
      nextDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const devRole = roles.find((r) => r.slug === 'developer')!;
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@vegasystem.local' },
    update: {},
    create: {
      email: 'dev@vegasystem.local',
      passwordHash: await bcrypt.hash('Dev@123', 12),
      firstName: 'Alex',
      lastName: 'Developer',
      roleId: devRole.id,
    },
  });

  await prisma.employeeProfile.upsert({
    where: { userId: devUser.id },
    update: {},
    create: {
      userId: devUser.id,
      department: 'Development',
      skills: ['TypeScript', 'NestJS', 'React', 'PostgreSQL'],
      workload: 3,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Monthly review',
      description: 'Review progress and upcoming reels',
      clientId: client.id,
      organizerId: devUser.id,
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
      location: 'Zoom',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Website Development',
      description: 'Full-stack website development — UI/UX through maintenance',
      clientId: client.id,
      status: 'IN_PROGRESS',
      progress: 28,
      template: 'software',
      phase: 'frontend',
      priority: 'HIGH',
      startDate: new Date(),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    },
  });

  const phaseDefs = [
    { slug: 'ui-ux', name: 'UI/UX', sortOrder: 1, status: 'completed', progress: 100 },
    { slug: 'frontend', name: 'Frontend', sortOrder: 2, status: 'active', progress: 45 },
    { slug: 'backend', name: 'Backend', sortOrder: 3, status: 'active', progress: 30 },
    { slug: 'testing', name: 'Testing', sortOrder: 4, status: 'pending', progress: 0 },
    { slug: 'deployment', name: 'Deployment', sortOrder: 5, status: 'pending', progress: 0 },
    { slug: 'maintenance', name: 'Maintenance', sortOrder: 6, status: 'pending', progress: 0 },
  ];

  const phases: Record<string, string> = {};
  for (const p of phaseDefs) {
    const ph = await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        slug: p.slug,
        name: p.name,
        sortOrder: p.sortOrder,
        status: p.status,
        progress: p.progress,
        priority: 'HIGH',
        leadId: devUser.id,
        dueDate: new Date(Date.now() + p.sortOrder * 14 * 24 * 60 * 60 * 1000),
      },
    });
    phases[p.slug] = ph.id;
  }

  await prisma.task.createMany({
    data: [
      { title: 'Design homepage mockup', projectId: project.id, phaseId: phases['ui-ux'], creatorId: devUser.id, status: 'DONE', priority: 'HIGH' },
      { title: 'Design system tokens', projectId: project.id, phaseId: phases['ui-ux'], creatorId: devUser.id, status: 'DONE', priority: 'MEDIUM' },
      { title: 'Implement navigation component', projectId: project.id, phaseId: phases['frontend'], creatorId: devUser.id, assigneeId: devUser.id, status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      { title: 'Build dashboard layout', projectId: project.id, phaseId: phases['frontend'], creatorId: devUser.id, assigneeId: devUser.id, status: 'TODO', priority: 'HIGH', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { title: 'REST API modules', projectId: project.id, phaseId: phases['backend'], creatorId: devUser.id, status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { title: 'Database schema', projectId: project.id, phaseId: phases['backend'], creatorId: devUser.id, status: 'DONE', priority: 'URGENT' },
      { title: 'E2E test suite', projectId: project.id, phaseId: phases['testing'], creatorId: devUser.id, status: 'TODO', priority: 'MEDIUM', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    ],
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: devUser.id } },
    create: { projectId: project.id, userId: devUser.id, role: 'developer' },
    update: {},
  });

  await prisma.milestone.createMany({
    data: [
      { projectId: project.id, title: 'Frontend MVP delivery', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      { projectId: project.id, title: 'Beta launch', dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
    ],
    skipDuplicates: true,
  });

  await prisma.projectIssue.create({
    data: {
      projectId: project.id,
      phaseId: phases['frontend'],
      title: 'RTL layout breaks on mobile sidebar',
      description: 'Sidebar overlaps content below 768px in Arabic locale',
      severity: 'HIGH',
      status: 'open',
      assigneeId: devUser.id,
    },
  });

  await prisma.asset.create({
    data: {
      projectId: project.id,
      name: 'UI Wireframes v2',
      type: 'DOCUMENT',
      fileUrl: '/files/wireframes-v2.pdf',
      tags: ['wireframes', 'ui-ux', 'project'],
      description: 'Wireframes for homepage and dashboard',
      metadata: { phaseId: phases['ui-ux'] },
    },
  });

  await prisma.video.create({
    data: {
      title: 'Product demo reel — raw',
      rawFileUrl: '/files/demo-raw.mp4',
      editedUrl: '/files/demo-edited.mp4',
      status: 'published',
    },
  });

  const oldProject = await prisma.project.create({
    data: {
      name: 'Legacy E-commerce Site',
      description: 'Completed Shopify rebuild — archived',
      clientId: client.id,
      status: 'ARCHIVED',
      archivedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      progress: 100,
      template: 'software',
    },
  });

  await prisma.asset.create({
    data: {
      projectId: oldProject.id,
      clientId: client.id,
      name: `Project archive: ${oldProject.name}`,
      type: 'DOCUMENT',
      fileUrl: '#',
      tags: ['archived-project', 'project-bundle'],
      archivedAt: oldProject.archivedAt,
      description: 'Full project deliverables bundle',
      metadata: { projectId: oldProject.id, archived: true },
    },
  });

  const inv1 = await prisma.invoice.upsert({
    where: { number: 'INV-00001' },
    update: { serviceType: 'Web Development' },
    create: {
      number: 'INV-00001',
      clientId: client.id,
      amount: 5000,
      tax: 250,
      total: 5250,
      status: 'PAID',
      serviceType: 'Web Development',
      paidAt: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [{ description: 'Website phase 1', qty: 1, price: 5000 }],
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { number: 'INV-00002' },
    update: {},
    create: {
      number: 'INV-00002',
      clientId: client.id,
      amount: 3200,
      tax: 160,
      total: 3360,
      status: 'SENT',
      serviceType: 'Media Production',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: [{ description: 'Product shoot package', qty: 1, price: 3200 }],
    },
  });

  await prisma.invoice.upsert({
    where: { number: 'INV-00003' },
    update: {},
    create: {
      number: 'INV-00003',
      clientId: client.id,
      amount: 1800,
      tax: 90,
      total: 1890,
      status: 'OVERDUE',
      serviceType: 'Marketing',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: [{ description: 'Social media management', qty: 1, price: 1800 }],
    },
  });

  await prisma.payment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      invoiceId: inv1.id,
      amount: 5250,
      method: 'bank_transfer',
      status: 'COMPLETED',
      reference: 'PAY-DEMO-001',
      paidAt: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv2.id,
      amount: 1000,
      method: 'card',
      status: 'COMPLETED',
      reference: 'PAY-DEMO-002',
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.expense.createMany({
    data: [
      { title: 'Adobe Creative Cloud', amount: 240, category: 'Software', isRecurring: true, date: new Date() },
      { title: 'Studio rent', amount: 4500, category: 'Operations', isRecurring: true, date: new Date() },
      { title: 'Camera equipment', amount: 1200, category: 'Equipment', isRecurring: false, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { title: 'Freelance editor', amount: 800, category: 'Contractors', isRecurring: false, date: new Date() },
    ],
    skipDuplicates: true,
  });

  const empProfile = await prisma.employeeProfile.findFirst({ where: { userId: devUser.id } });
  if (empProfile) {
    await prisma.payroll.create({
      data: {
        employeeId: empProfile.id,
        amount: 12000,
        period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        paidAt: new Date(),
        notes: 'Monthly salary',
      },
    });
    const perfCount = await prisma.performanceReport.count({ where: { employeeId: empProfile.id } });
    if (perfCount === 0) {
      await prisma.performanceReport.createMany({
        data: [
          { employeeId: empProfile.id, period: 'Q1 2026', score: 88, feedback: 'Strong delivery on API modules' },
          { employeeId: empProfile.id, period: 'Q4 2025', score: 82, feedback: 'Consistent sprint completion' },
        ],
      });
    }
  }

  const modelRole = roles.find((r) => r.slug === 'model')!;
  const modelUser = await prisma.user.upsert({
    where: { email: 'model@vegasystem.local' },
    update: {},
    create: {
      email: 'model@vegasystem.local',
      passwordHash: await bcrypt.hash('Model@123', 12),
      firstName: 'Sara',
      lastName: 'AlNoor',
      roleId: modelRole.id,
      phone: '+971501234567',
      locale: 'ar',
    },
  });

  const demoModel = await prisma.modelProfile.upsert({
    where: { userId: modelUser.id },
    update: {},
    create: {
      userId: modelUser.id,
      bio: 'Fashion and commercial model — Dubai',
      contentTypes: ['Fashion', 'Reels', 'Product', 'Events'],
      measurements: { height: '175', bust: '86', waist: '62', hips: '90', shoe: '39', hair: 'Brown', eyes: 'Brown' },
      rates: { hourly: 500, halfDay: 2000, fullDay: 3500, currency: 'USD' },
      photos: [
        { url: '/files/model-portfolio-1.jpg', title: 'Editorial look 1' },
        { url: '/files/model-portfolio-2.jpg', title: 'Commercial shoot' },
      ],
      videos: [{ url: '/files/model-reel.mp4', title: 'Showreel 2025' }],
      availability: {
        sunday: { available: false },
        monday: { from: '10:00', to: '18:00', available: true },
        tuesday: { from: '10:00', to: '18:00', available: true },
        wednesday: { from: '10:00', to: '18:00', available: true },
        thursday: { from: '10:00', to: '18:00', available: true },
        friday: { from: '14:00', to: '20:00', available: true },
        saturday: { available: false },
      },
      previousProjects: [
        { name: 'Luxury Watch Campaign', client: 'Demo Corp', year: '2025' },
        { name: 'Summer Collection Reels', client: 'Fashion Brand', year: '2024' },
      ],
    },
  });

  const demoShoot = await prisma.shoot.upsert({
    where: { id: '00000000-0000-0000-0000-000000000099' },
    update: {
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000099',
      title: 'Product shoot — Studio A',
      projectId: project.id,
      location: 'Studio A, Dubai',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
    },
  });

  const existingBooking = await prisma.modelBooking.findFirst({ where: { modelId: demoModel.id } });
  if (!existingBooking) {
    await prisma.modelBooking.create({
      data: {
        modelId: demoModel.id,
        shootId: demoShoot.id,
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        status: 'confirmed',
        notes: 'Product shoot — Studio A',
      },
    });
  }

  let delayedProject = await prisma.project.findFirst({ where: { name: 'Brand Campaign (Delayed)' } });
  if (!delayedProject) {
    delayedProject = await prisma.project.create({
      data: {
        name: 'Brand Campaign (Delayed)',
        description: 'Past deadline — demo alert',
        clientId: client.id,
        status: 'IN_PROGRESS',
        progress: 55,
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const overdueTaskExists = await prisma.task.findFirst({ where: { title: 'Client approval — overdue' } });
  if (!overdueTaskExists) {
    await prisma.task.create({
      data: {
        title: 'Client approval — overdue',
        projectId: delayedProject.id,
        creatorId: devUser.id,
        assigneeId: devUser.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const editorUser = await prisma.user.findUnique({ where: { email: 'editor@vegasystem.local' } });
  const photoUser = await prisma.user.findUnique({ where: { email: 'photo@vegasystem.local' } });

  const contentCount = await prisma.contentCalendar.count();
  if (contentCount === 0 && editorUser && demoModel) {
    await prisma.contentCalendar.createMany({
      data: [
        {
          title: 'Summer Collection Reel',
          platform: 'Instagram',
          status: 'SCHEDULED',
          publishDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          modelId: demoModel.id,
          editorId: editorUser.id,
          photographerId: photoUser?.id,
          script: 'Opening hook + product showcase + CTA',
        },
        {
          title: 'Product Launch Reel — Demo Corp',
          platform: 'TikTok',
          status: 'IN_PRODUCTION',
          publishDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          editorId: editorUser.id,
          photographerId: photoUser?.id,
        },
        {
          title: 'Behind the Scenes Reel',
          platform: 'Instagram',
          status: 'APPROVED',
          publishDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          editorId: editorUser.id,
        },
      ],
    });
  }

  const TEAM_ROOM_ID = '00000000-0000-0000-0000-0000000000chat';
  await prisma.chatRoom.upsert({
    where: { id: TEAM_ROOM_ID },
    update: { name: 'VegaCore Team' },
    create: { id: TEAM_ROOM_ID, name: 'VegaCore Team', isGroup: true },
  });

  const staffUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@vegasystem.local' }, status: 'ACTIVE' },
    select: { id: true },
  });
  for (const u of staffUsers) {
    await prisma.chatParticipant.upsert({
      where: { roomId_userId: { roomId: TEAM_ROOM_ID, userId: u.id } },
      create: { roomId: TEAM_ROOM_ID, userId: u.id },
      update: {},
    });
  }

  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@vegasystem.local' } });
  const chatMsgCount = await prisma.chatMessage.count({ where: { roomId: TEAM_ROOM_ID } });
  if (chatMsgCount === 0 && adminUser) {
    await prisma.chatMessage.createMany({
      data: [
        {
          roomId: TEAM_ROOM_ID,
          senderId: adminUser.id,
          content: 'Welcome to VegaCore internal chat — coordinate projects and tasks here.',
        },
        {
          roomId: TEAM_ROOM_ID,
          senderId: devUser.id,
          content: 'مرحباً بالفريق! يمكنكم من هنا متابعة التصوير والمهام والتسليمات.',
        },
      ],
    });
  }

  console.log('Seed completed successfully!');
  console.log('Admin: admin@vegasystem.local / Admin@123');
  console.log('General Manager: manager@vegasystem.local / Manager@123');
  console.log('Project Manager: pm@vegasystem.local / Pm@123');
  console.log('Developer: dev@vegasystem.local / Dev@123');
  console.log('Marketing: marketing@vegasystem.local / Marketing@123');
  console.log('Photographer: photo@vegasystem.local / Photo@123');
  console.log('Editor: editor@vegasystem.local / Editor@123');
  console.log('Model: model@vegasystem.local / Model@123');
  console.log('Accountant: accountant@vegasystem.local / Accountant@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
