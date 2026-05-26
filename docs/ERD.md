# VegaCore OS – Entity Relationship Diagram

## Core Entities

```mermaid
erDiagram
    Role ||--o{ User : has
    Role ||--o{ RolePermission : has
    Permission ||--o{ RolePermission : has
    User ||--o{ RefreshToken : has
    User ||--o{ Session : has
    User ||--o| EmployeeProfile : has
    User ||--o| ModelProfile : has

    Client ||--o{ ClientPackage : has
    Client ||--o{ Project : has
    Client ||--o{ Invoice : has
    Client ||--o{ Asset : has
    Client ||--o{ Contract : has
    Client ||--o{ ClientTimeline : has

    Project ||--o{ Task : contains
    Project ||--o{ ProjectMember : has
    Project ||--o{ Milestone : has
    Project ||--o{ Sprint : has
    Project ||--o{ Shoot : has

    Task ||--o{ Comment : has
    Task ||--o{ TaskAttachment : has
    User ||--o{ Task : assigned

    Campaign ||--o{ ContentCalendar : has
    ModelProfile ||--o{ ContentCalendar : assigned
    ContentCalendar ||--o{ Approval : requires

    Shoot ||--o{ Video : produces
    Shoot ||--o{ ModelBooking : schedules
    ModelProfile ||--o{ ModelBooking : has

    Invoice ||--o{ Payment : receives
    SecurityReport ||--o{ Vulnerability : contains

    Asset ||--o{ AssetVersion : versions
    ChatRoom ||--o{ ChatMessage : contains
    ChatRoom ||--o{ ChatParticipant : has
```

## Table Index

| Module | Tables |
|--------|--------|
| Auth/RBAC | users, roles, permissions, role_permissions, sessions, refresh_tokens |
| CRM | clients, client_packages, client_timeline |
| Projects | projects, project_members, tasks, task_attachments, comments, milestones, sprints |
| Marketing | content_calendar, campaigns, scripts, approvals |
| Media | shoots, videos, model_bookings |
| Models | model_profiles |
| HR | employee_profiles, attendance, leave_requests, performance_reports |
| Finance | invoices, payments, subscriptions, expenses, payroll |
| Archive | assets, asset_versions, contracts |
| Security | security_reports, vulnerabilities |
| System | notifications, audit_logs, activities, ai_requests, meetings, chat_* |

## Key Relationships

- **User → Role**: Many-to-one with permission inheritance via `role_permissions`
- **Client → Project**: One client, many projects (optional clientId)
- **Project → Task**: Kanban tasks with status, priority, columnOrder
- **ContentCalendar → Approval**: Workflow: Draft → Production → Approval → Published
- **Invoice → Payment**: Financial tracking with status lifecycle
