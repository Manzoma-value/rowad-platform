<div align="center">

# منصة بناء الأهلية
### Binaa Al-Ahliya · الرواد Educational Platform

**A full-stack, multi-tenant Islamic educational platform powering schools, teachers, and students — bilingual Arabic & Albanian.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.7-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Roles & Dashboards](#-roles--dashboards)
- [Student Onboarding Pipeline](#-student-onboarding-pipeline)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Authentication Flows](#-authentication-flows)
- [Internationalization](#-internationalization)
- [Deployment](#-deployment)

---

## Overview

**Bina Al-Ahliya** is a production-grade, multi-tenant educational platform designed for Islamic schools. It manages the full lifecycle of a student's journey — from platform-level onboarding and school assignment to class placement, curriculum delivery, quizzes, and character-development tracking.

The platform serves **four distinct roles** across separate dashboards, each with granular access control. It is fully bilingual in **Arabic (RTL)** and **Albanian (LTR)**, with dynamic layout direction switching at runtime. Schools are isolated tenants with their own branding, language settings, and assessment configuration.

---

## Key Features

### Platform-Wide
- **Multi-tenant architecture** — Each school is an isolated tenant with a custom slug, color scheme, and language preference
- **Role-based access control** — Four roles (Owner, School Admin, Teacher, Student) with server-enforced route protection
- **Bilingual UI** — Full Arabic (RTL) and Albanian (LTR) support with runtime language switching
- **Token-based invite system** — Secure email invitations for school admins and teachers
- **Complete auth flow** — Sign up, email confirmation, forgot password, and password reset via Supabase Auth
- **Avatar uploads** — Profile photo upload, preview, and removal via Supabase Storage

### Owner (Platform Admin)
- Manage all schools across the platform
- Configure the platform-wide **intake assessment** (the test every new student must pass)
- Review and approve student intake submissions
- Invite school administrators via tokenized email links
- Platform-level statistics dashboard

### School Admin
- Full **roadmap builder** — Create structured learning paths with stages, modules, rich content (text / image / video), and assessment questions
- **Character-trait mapping** — Tag each stage against the 5 Maqasid Al-Shariah (Deen, Aql, Nafs, Nasl, Mal)
- Manage teachers, students, and classes within the school
- Configure and manage the school's **placement assessment**
- Review placement submissions and assign students to classes
- Generate class and student performance reports with trait analytics
- Community hub moderation

### Teacher
- View assigned classes and student rosters
- Create and publish **quizzes** for their classes
- Post announcements to classes
- Mark student module completions and evaluate **character traits** per module
- Access per-student performance reports
- Participate in the school **community hub**

### Student
- Guided **onboarding pipeline** (intake → waiting → school assignment → placement → class assignment → welcome)
- Interactive learning **roadmap** with staged modules, rich content, and embedded quizzes
- Class dashboard with teacher announcements
- General quizzes assigned by teachers
- School **community hub** (social feed with reactions and threaded replies)
- Profile management with avatar and password change

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Animations | Framer Motion | 12.x |
| Icons | Lucide React | 1.16 |
| ORM | Prisma | 7.7.0 |
| Database | PostgreSQL (via `pg`) | — |
| Auth & Storage | Supabase | 2.103.0 |
| SSR Auth | @supabase/ssr | 0.10.2 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                    │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌──────────────┐   │
│  │  /owner  │  │/school-   │  │/teacher │  │   /student   │   │
│  │ dashboard│  │admin dash │  │dashboard│  │  dashboard   │   │
│  └──────────┘  └───────────┘  └─────────┘  └──────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    /api  Route Handlers                  │   │
│  │  owner/ · school-admin/ · teacher/ · student/ · hub/    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │   Prisma 7 + PostgreSQL  │  │  Supabase Auth & Storage  │   │
│  │   (schema: 19 models)    │  │  (sessions, avatars, SSR) │   │
│  └──────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

- **Server Components** handle data fetching and route-level auth checks
- **Client Components** manage interactive UI, forms, and real-time state
- **Route Handlers** (`/api/...`) serve JSON for all data mutations and reads
- **Prisma** connects to PostgreSQL via `@prisma/adapter-pg` (edge-compatible)
- **Supabase** handles authentication sessions (JWT cookies via `@supabase/ssr`) and file storage

---

## Roles & Dashboards

| Role | Entry Point | Key Capabilities |
|---|---|---|
| `OWNER` | `/owner` | Platform management, school CRUD, intake config, global reviews |
| `SCHOOL_ADMIN` | `/school-admin` | Roadmap builder, class/student/teacher management, placement tests, reports |
| `TEACHER` | `/teacher` | Quiz creation, announcements, trait assessments, student reports |
| `STUDENT` | `/student` | Onboarding pipeline, roadmap learning, quizzes, community hub |

After authentication, users are redirected to their role-specific dashboard via `/auth/callback`. Middleware and layout-level guards enforce role isolation.

---

## Student Onboarding Pipeline

Every new student moves through a strictly ordered pipeline before reaching the main dashboard:

```
PENDING_INTAKE
     │
     ▼ (completes intake assessment)
INTAKE_SUBMITTED ──► Owner reviews → assigns school
     │
     ▼
SCHOOL_ASSIGNED
     │
     ▼ (completes placement assessment)
SCHOOL_PLACEMENT_SUBMITTED ──► Admin reviews → assigns class
     │
     ▼
CLASS_ASSIGNED
     │
     ▼
/student/welcome  ──►  Full dashboard access
```

Each status maps to a protected page. The student layout guard reads `onboarding_status` on every navigation and redirects to the correct step if the student tries to skip ahead.

---

## Database Schema

The platform uses **19 Prisma models** across these domains:

### Users & Schools
| Model | Description |
|---|---|
| `Profile` | Central user record — holds `role`, `full_name`, `email`, `avatar_url`, `avatar_path` |
| `School` | Tenant record — `name`, `slug`, `language`, `primaryColor`, `secondaryColor` |
| `Student` | Links `Profile` → `School` → `Class`, tracks `onboarding_status` |
| `Teacher` | Links `Profile` → `School`, may teach multiple classes |
| `Class` | Belongs to `School`, has one `Teacher` and many `Student`s |

### Assessments
| Model | Description |
|---|---|
| `Assessment` | Intake or placement test, owned by platform or school |
| `AssessmentQuestion` | MCQ / TF / Written question with options |
| `AssessmentAttempt` | Student's submitted answers + `review_status` |
| `Quiz` | Teacher-created quiz scoped to a class |
| `QuizQuestion` | Questions within a quiz |
| `QuizAttempt` | Student's quiz submission |

### Roadmap & Learning
| Model | Description |
|---|---|
| `Roadmap` | Root learning path, one per school |
| `RoadmapStage` | Phase within a roadmap (e.g., Beginner, Intermediate) |
| `RoadmapModule` | Unit within a stage — holds content and questions |
| `ModuleContent` | Rich content item (TEXT / IMAGE / VIDEO) |
| `RoadmapQuestion` | MCQ / TF / Written / Matching question in a module |
| `ModuleAttempt` | Records a student's score on a module quiz |

### Character Development (Maqasid)
| Model | Description |
|---|---|
| `StageTrait` | Maps a stage to one of 5 Maqasid (Deen, Aql, Nafs, Nasl, Mal) |
| `TraitElement` | Visual guidance element within a trait |
| `TraitAssessment` | Teacher evaluation of a student after module completion |
| `TraitEvaluation` | Individual Maqasid score within an assessment |

### Social Hub
| Model | Description |
|---|---|
| `Post` | Message in the school community feed, supports threaded replies |
| `Reaction` | LIKE / LOVE / HAHA / SAD / DISLIKE on a post |

---

## Project Structure

```
src/
├── app/
│   ├── (public)/            # Landing, login, signup, forgot/reset password
│   ├── auth/callback/       # Supabase auth callback handler (OTP + PKCE)
│   ├── invite/[token]/      # Token-based invite acceptance page
│   ├── schools/[slug]/      # School portal (login, signup)
│   │
│   ├── owner/               # Platform admin dashboard
│   ├── school-admin/        # School admin dashboard
│   ├── teacher/             # Teacher dashboard
│   └── student/             # Student dashboard + onboarding pages
│       ├── intake/          # Step 1: Platform intake test
│       ├── waiting/         # Step 2: Waiting for school assignment
│       ├── school-assigned/ # Step 3: Start placement test
│       ├── placement/       # Step 4: School placement test
│       ├── waiting-class/   # Step 5: Waiting for class assignment
│       └── welcome/         # Step 6: Welcome to your class
│
│   └── api/
│       ├── owner/
│       ├── school-admin/
│       ├── teacher/
│       ├── student/
│       ├── hub/
│       ├── invite/
│       ├── profile/
│       └── auth/
│
├── lib/
│   ├── supabase/            # client.ts, server.ts (SSR helpers)
│   ├── prisma.ts            # Singleton Prisma client
│   ├── language-context.tsx # Global lang state (ar / sq)
│   ├── translations.ts      # All shared UI strings (ar + sq)
│   ├── LangToggle.tsx       # Language switcher component
│   └── api-cache.ts         # Client-side fetch cache with TTL
│
└── components/
    └── MandalaLoader.tsx    # Branded loading spinner
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** database (local or hosted)
- **Supabase** project (for auth and storage)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd student-platform

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env.local

# 4. Push the database schema
npx prisma db push

# 5. Generate the Prisma client
npx prisma generate

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build   # Runs prisma generate then next build
npm start       # Starts the production server
```

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# ─── Database ──────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# ─── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ─── Application ───────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string for Prisma |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key — used server-side only for admin operations |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Full URL of the app — used in auth redirect URLs and invite emails |

> **Security:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It is only used in server-side API route handlers.

---

## API Reference

All API routes live under `/api/` and return JSON. They require an authenticated Supabase session cookie.

### Owner Routes (`/api/owner/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/owner/schools` | List all schools / create a school |
| `GET/PATCH/DELETE` | `/api/owner/schools/[id]` | Get, update, or delete a school |
| `GET/POST/DELETE` | `/api/owner/intake-assessment` | Manage platform intake assessment |
| `GET` | `/api/owner/submissions` | List all student intake submissions |
| `POST` | `/api/owner/submissions/[id]/review` | Assign a school to a student |
| `GET/POST` | `/api/owner/admins` | List school admins / create admin profile |
| `POST` | `/api/owner/invites` | Send school admin invite email |
| `GET` | `/api/owner/stats` | Platform-wide statistics |

### School Admin Routes (`/api/school-admin/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/DELETE` | `/api/school-admin/roadmap` | Roadmap CRUD |
| `GET/POST/DELETE` | `/api/school-admin/roadmap/stages` | Stage management |
| `GET/POST/DELETE` | `/api/school-admin/roadmap/modules` | Module management |
| `GET/POST/DELETE` | `/api/school-admin/roadmap/questions` | Module questions |
| `GET/POST/DELETE` | `/api/school-admin/roadmap/contents` | Module content (text/image/video) |
| `GET/POST/DELETE` | `/api/school-admin/roadmap/traits` | Maqasid trait mapping |
| `GET/POST` | `/api/school-admin/classes` | Class management |
| `GET/PATCH` | `/api/school-admin/students/[id]` | Student details and activation toggle |
| `POST` | `/api/school-admin/students/[id]/assign-class` | Assign student to a class |
| `GET/PATCH` | `/api/school-admin/teachers/[id]` | Teacher details and activation toggle |
| `GET/POST/DELETE` | `/api/school-admin/placement-assessment` | Placement assessment CRUD |
| `GET` | `/api/school-admin/submissions` | Placement submission list with filters |
| `POST` | `/api/school-admin/submissions/[id]/review` | Review and assign class from submission |
| `POST` | `/api/school-admin/invites` | Invite a teacher by email |

### Teacher Routes (`/api/teacher/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/teacher` | Teacher profile with classes |
| `GET/POST/DELETE` | `/api/teacher/quizzes` | Quiz management |
| `GET/POST/DELETE` | `/api/teacher/announcements` | Class announcements |
| `GET` | `/api/teacher/reports` | Class performance report |
| `GET` | `/api/teacher/reports/students/[id]` | Individual student report |
| `GET/POST` | `/api/teacher/trait-assessments/[studentId]/[moduleId]` | Trait evaluation |

### Student Routes (`/api/student/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/student` | Full student context (profile, school, class, status) |
| `GET` | `/api/student/roadmap` | Full roadmap with progress |
| `POST` | `/api/student/roadmap/modules/[id]/attempt` | Submit module quiz |
| `GET/POST` | `/api/student/intake` | Get intake assessment / submit answers |
| `GET` | `/api/student/intake-result` | Get intake score |
| `GET/POST` | `/api/student/placement` | Get placement assessment / submit answers |
| `GET` | `/api/student/placement-result` | Get placement score |
| `GET` | `/api/student/quizzes` | List available quizzes |
| `POST` | `/api/student/quizzes/[id]/submit` | Submit a quiz |
| `GET` | `/api/student/announcements` | Class announcements |

### Hub (Social Feed)

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/hub/posts` | List/create posts |
| `GET/POST` | `/api/hub/posts/[id]/replies` | Thread replies |
| `POST/DELETE` | `/api/hub/posts/[id]/reactions` | React to a post |

---

## Authentication Flows

### Standard Sign Up
1. User fills the signup form → `supabase.auth.signUp()` is called with `emailRedirectTo: /auth/callback`
2. Supabase sends a confirmation email
3. User clicks the link → `/auth/callback?token_hash=...&type=signup`
4. Server verifies the OTP, fetches the user, syncs the profile email, and redirects to the role dashboard

### Invite-Based Registration (Admins & Teachers)
1. Owner/Admin sends an invite → a signed token record is stored in the DB and an email is dispatched
2. Recipient opens `/invite/[token]` → token is validated and role/school info is shown
3. User sets a password → `supabase.auth.signUp()` is called (sends confirmation email)
4. After email confirmation → profile is created with the correct role and school association

### Password Reset
1. User visits `/forgot-password` → enters email → `supabase.auth.resetPasswordForEmail()` is called with `redirectTo: /auth/callback`
2. User clicks the email link → `/auth/callback?token_hash=...&type=recovery`
3. **Recovery type is detected early** — redirected immediately to `/reset-password` (skips role lookup)
4. On `/reset-password` the session is validated, and `supabase.auth.updateUser({ password })` is called

### Session Management
- Sessions are stored in HTTP-only cookies via `@supabase/ssr`
- `createClient()` (client) and `createClient()` (server) are separate utilities with different cookie strategies
- API routes use the server client to validate the session before every operation

---

## Internationalization

The platform supports two languages, switchable at runtime:

| Language | Code | Direction | Font |
|---|---|---|---|
| Arabic | `ar` | RTL | Cairo |
| Albanian | `sq` | LTR | Cairo |

**How it works:**

- `src/lib/language-context.tsx` exposes a `useLang()` hook that provides `lang` and `setLang`
- Each page that needs translation defines a local `S = { ar: {...}, sq: {...} }` object and picks `T = S[lang]`
- Shared strings (nav labels, quiz terms, etc.) live in `src/lib/translations.ts`
- `dir={lang === "sq" ? "ltr" : "rtl"}` is applied to root `<div>` elements
- Schools can specify a default language; the student layout respects this and offers a toggle when the school uses a non-Arabic language

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set all environment variables in the Vercel project dashboard under **Settings → Environment Variables**.

The build command (`npm run build`) runs `prisma generate` automatically before the Next.js build — no extra configuration needed.

### Docker / Self-hosted

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Supabase Setup Checklist

Before deploying, ensure the following are configured in your Supabase project:

- [ ] **Email templates** — Customize confirmation and password-reset emails
- [ ] **Redirect URLs** — Add your production URL to the allow-list in **Auth → URL Configuration**
- [ ] **Storage bucket** — Create a public bucket named `avatars` for profile photos
- [ ] **RLS policies** — Review Row Level Security if you have policies enabled (the app uses the service role key for server-side writes)

### Database Migration

```bash
# Apply schema changes to the production database
npx prisma db push

# Or use migrations for a more controlled workflow
npx prisma migrate deploy
```

---

## Scripts

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build     # prisma generate + next build
npm start         # Start production server
npm run lint      # Run ESLint
npx prisma studio # Open Prisma Studio (database GUI)
```

---

<div align="center">

Built with purpose · منصة بناء الأهلية — 2026

</div>
