#!/bin/bash

# Start Supabase Edge Functions for local development
# Usage: ./scripts/start-functions-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Starting Supabase Edge Functions for local development${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if .env.local exists and source it
if [ -f ".env.local" ]; then
    echo -e "${GREEN}📋 Loading environment variables from .env.local${NC}"
    export $(grep -v '^#' .env.local | xargs)
else
    echo -e "${YELLOW}⚠️  .env.local not found. Make sure to set environment variables manually.${NC}"
fi

# Check if supabase is initialized
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${YELLOW}🔧 Initializing Supabase project...${NC}"
    supabase init
fi

echo -e "${GREEN}🚀 Starting Supabase local development environment...${NC}"

# Start Supabase (this will start the database, API, and Edge Functions runtime)
supabase start

echo -e "${GREEN}✅ Supabase is running locally!${NC}"
echo ""
echo -e "${YELLOW}📖 Edge Function URLs:${NC}"
echo "  • Retell Webhook: http://127.0.0.1:54321/functions/v1/retell-webhook"
echo "  • Campaign Trigger: http://127.0.0.1:54321/functions/v1/campaign-trigger"
echo ""
echo -e "${YELLOW}📖 Other services:${NC}"
echo "  • API: http://127.0.0.1:54321"
echo "  • Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo "  • Studio: http://127.0.0.1:54323"
echo ""
echo -e "${YELLOW}🔧 To test Edge Functions:${NC}"
echo "  curl -X POST http://127.0.0.1:54321/functions/v1/retell-webhook \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'x-retell-signature: your-webhook-secret' \\"
echo "    -d '{\"event_type\": \"call_started\", \"data\": {\"call_id\": \"test-123\"}}'"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"

# Keep the script running
trap 'echo -e "${YELLOW}🛑 Stopping Supabase...${NC}"; supabase stop; exit 0' INT
while true; do
    sleep 1
done