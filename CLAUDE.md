# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 SaaS starter template with TypeScript, PostgreSQL, Stripe payments, and JWT authentication.

## Essential Commands

```bash
# Development
pnpm dev         # Start development server with Turbopack

# Build & Production
pnpm build       # Build for production
pnpm start       # Start production server

# Database
pnpm db:setup    # Interactive setup for database connection
pnpm db:seed     # Seed database with test data
pnpm db:generate # Generate Drizzle migrations from schema changes
pnpm db:migrate  # Apply pending migrations
pnpm db:studio   # Open Drizzle Studio for database management
```

**Note**: This project does not have linting or testing commands configured. When implementing new features, ensure TypeScript types are correct by running `pnpm build`.

### Test User Credentials

After seeding, use these credentials:
- Email: `test@test.com`
- Password: `admin123`

## Architecture Overview

### Route Structure
- **App Router** with route groups:
  - `app/(dashboard)/` - Protected routes requiring authentication
  - `app/(login)/` - Authentication pages
  - `app/api/` - API routes (mainly Stripe webhooks)

### Authentication System
- JWT-based authentication using `jose` library
- Session cookies with 24-hour expiration
- Password hashing with `bcryptjs` (10 salt rounds)
- Global middleware protects `/dashboard` routes
- Session auto-renewal on GET requests
- Server Actions handle authentication with local middleware validation
- Key files: `lib/auth/*.ts`, `app/(login)/actions.ts`

### Database Layer
- **Drizzle ORM** with PostgreSQL
- Schema defined in `lib/db/schema.ts`
- All queries centralized in `lib/db/queries.ts`
- Migrations in `lib/db/migrations/`
- Connection management in `lib/db/drizzle.ts`

#### Database Schema (Drizzle + PostgreSQL)
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

### Payment Integration
- Stripe Checkout for subscription management
- Webhook handler at `app/api/stripe/webhook/route.ts`
- Price/product IDs from environment variables
- Customer Portal for self-service subscription management
- Subscription management with Customer Portal
- 14-day trial periods
- Webhook handling for subscription changes
- Product/pricing management via Stripe API

### Component Architecture
- Server Components by default (React 19)
- UI components from shadcn/ui in `components/ui/`
- Form validation using Server Actions with `lib/auth/middleware.ts`
- SWR for client-side data fetching with optimistic updates

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

### Key Patterns
1. **Server Actions**: All form submissions use Server Actions with validation middleware
2. **Type Safety**: Strict TypeScript with validated environment variables
3. **Data Access**: All database queries go through `lib/db/queries.ts`
4. **Error Handling**: Consistent error boundaries and toast notifications
5. **Protected Routes**: Middleware-based authentication checks

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_SUBSCRIPTION_PRICE_ID` - Monthly subscription price ID
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

## Development Workflow

1. **Database Changes**: 
   - Modify schema in `lib/db/schema.ts`
   - Run `pnpm db:generate` then `pnpm db:migrate`

2. **Adding API Routes**:
   - Create in `app/api/` directory
   - Use `lib/db/queries.ts` for data access
   - Validate with `lib/auth/validateRequest.ts`

3. **Creating Protected Pages**:
   - Add under `app/(dashboard)/`
   - Use Server Components for initial data
   - Implement client updates with SWR

4. **Form Handling**:
   - Create Server Actions in page `actions.ts` files
   - Use `validatedAction` middleware for validation
   - Return consistent response format

## Important Considerations

- The project uses experimental Next.js features (PPR, clientSegmentCache)
- Tailwind CSS v4 with PostCSS configuration
- No testing framework is configured
- Global styles in `app/globals.css`
- All timestamps stored as Unix milliseconds in database
- Uses TypeScript strict mode
- Turbopack for fast development builds
- Global SWR configuration pre-populates user/team data
- Activity logging system tracks user events via `ActivityType` enum
