#!/bin/bash

# Deploy Supabase Edge Functions
# Usage: ./scripts/deploy-functions.sh [function-name] [--production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENV="staging"
FUNCTION_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --production)
            ENV="production"
            shift
            ;;
        --staging)
            ENV="staging"
            shift
            ;;
        *)
            if [ -z "$FUNCTION_NAME" ]; then
                FUNCTION_NAME="$1"
            fi
            shift
            ;;
    esac
done

echo -e "${YELLOW}🚀 Deploying Supabase Edge Functions to ${ENV}${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to Supabase:${NC}"
    supabase login
fi

# Set project reference based on environment
if [ "$ENV" = "production" ]; then
    PROJECT_REF="${SUPABASE_PROJECT_REF_PROD:-your-prod-project-ref}"
else
    PROJECT_REF="${SUPABASE_PROJECT_REF_STAGING:-your-staging-project-ref}"
fi

echo -e "${YELLOW}📋 Project Reference: ${PROJECT_REF}${NC}"

# Function to deploy a specific function
deploy_function() {
    local func_name=$1
    echo -e "${YELLOW}📦 Deploying function: ${func_name}${NC}"
    
    if [ ! -d "supabase/functions/${func_name}" ]; then
        echo -e "${RED}❌ Function directory not found: supabase/functions/${func_name}${NC}"
        return 1
    fi
    
    supabase functions deploy ${func_name} --project-ref ${PROJECT_REF}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Function ${func_name} deployed successfully${NC}"
        
        # Show the function URL
        echo -e "${GREEN}🔗 Function URL: https://${PROJECT_REF}.supabase.co/functions/v1/${func_name}${NC}"
    else
        echo -e "${RED}❌ Failed to deploy function: ${func_name}${NC}"
        return 1
    fi
}

# Deploy specific function or all functions
if [ -n "$FUNCTION_NAME" ]; then
    deploy_function "$FUNCTION_NAME"
else
    echo -e "${YELLOW}📦 Deploying all Edge Functions...${NC}"
    
    # Deploy each function
    for func_dir in supabase/functions/*/; do
        if [ -d "$func_dir" ] && [ "$func_dir" != "supabase/functions/shared/" ]; then
            func_name=$(basename "$func_dir")
            deploy_function "$func_name"
        fi
    done
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"

# Show environment variables reminder
echo -e "${YELLOW}⚠️  Don't forget to set the following environment variables in Supabase:${NC}"
echo "  - RETELL_API_KEY"
echo "  - RETELL_WEBHOOK_SECRET" 
echo "  - SUPABASE_URL"
echo "  - SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo -e "${YELLOW}📖 Set them at: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions${NC}"