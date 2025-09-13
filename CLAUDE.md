# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production application
- `pnpm start` - Start production server

### Database Commands

- `pnpm db:setup` - Initialize database setup script
- `pnpm db:seed` - Seed database with default data
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Run Drizzle migrations
- `pnpm db:studio` - Launch Drizzle Studio for database management

### Test User Credentials

After seeding, use these credentials:
- Email: `test@test.com`
- Password: `admin123`

## Architecture Overview

### Authentication System
- JWT-based authentication using `jose` library
- Session cookies with 24-hour expiration
- Password hashing with `bcryptjs` (10 salt rounds)
- Global middleware protects `/dashboard` routes
- Session auto-renewal on GET requests

### Database Schema (Drizzle + PostgreSQL)
Core entities:
- **users**: Basic user info with role-based access (owner/member)
- **teams**: Multi-tenancy with Stripe integration
- **teamMembers**: User-team relationships with roles
- **activityLogs**: Audit trail for user actions
- **invitations**: Team invitation system

### Middleware Architecture
- **Global middleware** (`middleware.ts`): Route protection and session management
- **Action middleware** (`lib/auth/middleware.ts`): Server Action validation with Zod
  - `validatedAction`: Basic form validation
  - `validatedActionWithUser`: Requires authenticated user
  - `withTeam`: Requires team membership

### Stripe Integration
- Subscription management with Customer Portal
- 14-day trial periods
- Webhook handling for subscription changes
- Product/pricing management via Stripe API

### File Structure Patterns
- **App Router**: Route groups `(dashboard)` and `(login)` for layout organization
- **Shadcn/ui**: Component library in `/components/ui/`
- **Database**: Centralized in `/lib/db/` (schema, queries, migrations)
- **Authentication**: Isolated in `/lib/auth/`
- **Payments**: Stripe logic in `/lib/payments/`

### Key Dependencies
- Next.js 15 (Canary) with experimental features (PPR, clientSegmentCache)
- Drizzle ORM with PostgreSQL
- Radix UI unified package for components
- SWR for client-side data fetching with SSR fallbacks

### Development Notes
- Uses TypeScript strict mode
- Turbopack for fast development builds
- Global SWR configuration pre-populates user/team data
- Activity logging system tracks user events via `ActivityType` enum