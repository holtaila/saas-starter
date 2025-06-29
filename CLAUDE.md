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

## Architecture Overview

### Route Structure
- **App Router** with route groups:
  - `app/(dashboard)/` - Protected routes requiring authentication
  - `app/(login)/` - Authentication pages
  - `app/api/` - API routes (mainly Stripe webhooks)

### Authentication Flow
- JWT-based sessions stored in httpOnly cookies
- Global middleware in `middleware.ts` protects `/dashboard/*` routes
- Server Actions handle authentication with local middleware validation
- Key files: `lib/auth/*.ts`, `app/(login)/actions.ts`

### Database Layer
- **Drizzle ORM** with PostgreSQL
- Schema defined in `lib/db/schema.ts`
- All queries centralized in `lib/db/queries.ts`
- Migrations in `lib/db/migrations/`
- Connection management in `lib/db/drizzle.ts`

### Payment Integration
- Stripe Checkout for subscription management
- Webhook handler at `app/api/stripe/webhook/route.ts`
- Price/product IDs from environment variables
- Customer Portal for self-service subscription management

### Component Architecture
- Server Components by default (React 19)
- UI components from shadcn/ui in `components/ui/`
- Form validation using Server Actions with `lib/actions/middleware.ts`
- SWR for client-side data fetching with optimistic updates

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