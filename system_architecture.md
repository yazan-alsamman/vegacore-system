# VegaCore Operating System (VOS)

You are a senior-level software architect, system designer, DevOps engineer, security engineer, and full-stack engineering team.

Your mission is to design and build a production-grade enterprise operating system called:

# VegaCore Operating System (VOS)

This system is an advanced all-in-one ERP/CRM/Project Management/Marketing Operations platform for a digital business development company called VegaCore.

The platform MUST be:
- scalable
- modular
- secure
- maintainable
- enterprise-grade
- production-ready
- multilingual
- optimized
- clean architecture based
- API-first
- responsive
- cloud-ready
- VPS deployable
- dockerized
- future SaaS-ready

The system MUST be designed professionally with ZERO shortcuts.

---

# COMPANY OVERVIEW

VegaCore is a digital business development company with multiple departments:

## Development Department
Responsible for:
- Websites
- Mobile Applications
- Large Systems
- AI Solutions
- Cyber Security
- Vulnerability Detection

## Marketing Department
Responsible for:
- Branding
- Visual Identity Design
- Content Writing
- Social Media Management
- Photography
- Reel Editing
- Video Production
- Script Writing

## Human Resources
Current team includes:
- 3 Developers
- 3 Models
- 1 Content Writer
- 1 Photographer
- 1 Video Editor
- 1 General Manager

The General Manager handles:
- client coordination
- internal operations
- task management
- workflow supervision
- approvals
- scheduling

---

# MAIN GOAL

Build a centralized operating system that manages ALL company operations professionally.

The system MUST include:
- client management
- project management
- financial management
- task management
- team management
- marketing workflow
- media production workflow
- AI automation
- cybersecurity reports
- file archive system
- notifications
- approvals
- analytics
- audit logs
- activity tracking
- role permissions
- internal communication
- reporting system

---

# SYSTEM ARCHITECTURE REQUIREMENTS

Use enterprise-level architecture.

## Backend
Preferred:
- Node.js + NestJS

Alternative:
- Laravel

Architecture:
- Clean Architecture
- Modular Architecture
- Repository Pattern
- Service Layer
- DTO Validation
- Event Driven Architecture

## Frontend
- Next.js
- TypeScript
- TailwindCSS
- Responsive UI
- RTL Support
- Dark/Light Mode

## Mobile App
- Flutter

## Database
- PostgreSQL

## ORM
- Prisma ORM

## Storage
- AWS S3 compatible storage

## Realtime
- Socket.io

## Authentication
- JWT
- Refresh Tokens
- RBAC
- Session Management
- Activity Logs

## Deployment
- Docker
- Docker Compose
- VPS Ready
- NGINX
- SSL Support
- PM2

---

# SECURITY REQUIREMENTS

The platform MUST follow enterprise security standards.

Implement:
- RBAC permissions
- rate limiting
- request validation
- audit logs
- CSRF protection
- XSS protection
- SQL injection prevention
- encrypted credentials
- secure file uploads
- IP logging
- session expiration
- backup system
- disaster recovery structure

Cybersecurity module MUST support:
- penetration testing reports
- vulnerability tracking
- severity scoring
- audit history

---

# SYSTEM MODULES

---

# 1. CRM MODULE

Each client MUST have:

## Client Profile
- company name
- owner name
- phone
- email
- country
- social links
- business type
- onboarding date

## Package Details
- subscribed services
- reels quota
- design quota
- development hours
- hosting details
- contract duration

## Financial Information
- invoices
- payments
- due dates
- subscriptions
- recurring payments
- debt tracking

## File Management
- contracts
- logos
- branding assets
- credentials
- hosting information
- media files

## Timeline
- meetings
- updates
- notes
- messages
- completed tasks

---

# 2. PROJECT MANAGEMENT MODULE

Each project MUST support:
- Kanban board
- task assignment
- priorities
- deadlines
- milestones
- attachments
- comments
- status tracking
- progress tracking
- sprint management

Development projects should support:
- UI/UX phase
- frontend
- backend
- testing
- deployment
- maintenance

---

# 3. MARKETING MANAGEMENT MODULE

Include:
- content calendar
- social media planning
- script management
- publishing workflow
- approval system
- campaign tracking

Each content item should include:
- script
- assigned model
- photographer
- editor
- publish date
- platform
- status

---

# 4. MEDIA PRODUCTION MODULE

Manage:
- photography schedules
- shooting locations
- equipment
- shot lists
- models booking
- raw files
- edited versions
- publishing versions

---

# 5. MODELS MANAGEMENT MODULE

Each model should have:
- portfolio
- photos
- videos
- measurements
- availability calendar
- booking history
- rates
- assigned projects

---

# 6. HR & TEAM MANAGEMENT

Each employee should include:
- role
- permissions
- skills
- KPIs
- current workload
- performance reports
- attendance
- leave requests

Workflow automation MUST support:
Photographer → Editor → Content Writer → Manager Approval → Client Approval → Publishing

---

# 7. FINANCE MODULE

Features:
- invoices
- payroll
- expenses
- subscriptions
- recurring invoices
- profit analytics
- financial dashboard
- tax-ready reports

Dashboard analytics:
- monthly revenue
- top profitable clients
- top profitable services
- unpaid invoices
- cash flow

---

# 8. ARCHIVE SYSTEM

Implement a full archive system with:
- smart search
- tags
- filters
- file versioning
- historical tracking
- project archives
- media archives
- contracts archive

---

# 9. AI AUTOMATION MODULE

Implement AI-powered features:
- AI Script Generator
- AI Content Planner
- AI Task Distribution
- AI Client Analyzer
- AI Bug Analyzer

Architecture MUST allow future AI integrations.

---

# 10. EXECUTIVE DASHBOARD

Provide a powerful admin dashboard displaying:
- active projects
- delayed tasks
- financial analytics
- employee workloads
- client statuses
- KPIs
- system statistics

---

# ROLE & PERMISSION SYSTEM

Implement advanced RBAC.

Roles:
- Super Admin
- General Manager
- Project Manager
- Developer
- Marketing Manager
- Photographer
- Video Editor
- Model
- Accountant
- Client

Each role MUST have isolated permissions.

---

# SYSTEM FEATURES

Mandatory features:
- multilingual support
- Arabic RTL support
- notifications center
- internal chat
- Google Calendar sync
- WhatsApp integration architecture
- cloud backups
- PDF report generation
- advanced analytics
- audit logs
- activity tracking
- email notifications
- responsive mobile support

---

# DATABASE REQUIREMENTS

Design a scalable normalized PostgreSQL database.

Core tables:
- users
- roles
- permissions
- clients
- client_packages
- projects
- tasks
- invoices
- payments
- meetings
- shoots
- models
- videos
- scripts
- content_calendar
- assets
- contracts
- reports
- notifications
- audit_logs
- activities

Generate:
- ERD diagram
- migrations
- optimized indexing
- relational constraints

---

# API REQUIREMENTS

Build RESTful APIs with:
- proper versioning
- pagination
- filtering
- sorting
- rate limiting
- OpenAPI/Swagger documentation

---

# UI/UX REQUIREMENTS

Design should feel:
- modern
- premium
- enterprise-grade
- minimal
- fast
- elegant

Include:
- dashboards
- charts
- advanced tables
- kanban boards
- calendars
- analytics widgets

---

# DEVOPS REQUIREMENTS

Generate:
- Docker setup
- Docker Compose
- production configuration
- CI/CD structure
- environment configuration
- VPS deployment guide
- backup strategy
- monitoring structure

---

# CODE QUALITY REQUIREMENTS

The code MUST:
- be fully typed
- clean
- documented
- scalable
- reusable
- modular
- maintainable

Include:
- comments
- architecture documentation
- README files
- API docs

---

# OUTPUT REQUIREMENTS

Generate the project step-by-step professionally.

Start with:
1. System Architecture
2. Database Design
3. Folder Structure
4. Backend Foundation
5. Frontend Foundation
6. Authentication System
7. Core Modules
8. APIs
9. Dashboard UI
10. Deployment Setup

Do NOT skip architecture planning.

Do NOT generate fake implementations.

Do NOT generate placeholder structures without real production logic.

Everything must be enterprise-grade and production-ready.

Build this system like a real SaaS company product.