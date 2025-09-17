#!/bin/bash

# Test Supabase Edge Functions
# Usage: ./scripts/test-edge-functions.sh [--local|--staging|--production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to local testing
ENV="local"
BASE_URL="http://127.0.0.1:54321/functions/v1"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --local)
            ENV="local"
            BASE_URL="http://127.0.0.1:54321/functions/v1"
            shift
            ;;
        --staging)
            ENV="staging"
            BASE_URL="https://${SUPABASE_PROJECT_REF_STAGING:-your-staging-ref}.supabase.co/functions/v1"
            shift
            ;;
        --production)
            ENV="production"
            BASE_URL="https://${SUPABASE_PROJECT_REF_PROD:-your-prod-ref}.supabase.co/functions/v1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--local|--staging|--production]"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}🧪 Testing Edge Functions in ${ENV} environment${NC}"
echo -e "${BLUE}Base URL: ${BASE_URL}${NC}"
echo ""

# Load environment variables for secrets
if [ -f ".env.local" ]; then
    source .env.local
fi

# Test function to make HTTP requests
test_function() {
    local name="$1"
    local endpoint="$2"
    local method="$3"
    local headers="$4"
    local payload="$5"
    local expected_status="$6"
    
    echo -e "${BLUE}Testing ${name}...${NC}"
    
    # Make the request
    local response
    local http_status
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$endpoint" $headers)
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" $headers -d "$payload")
    fi
    
    # Extract HTTP status code (last line)
    http_status=$(echo "$response" | tail -n 1)
    # Extract response body (all lines except last)
    response_body=$(echo "$response" | head -n -1)
    
    echo "  Status: $http_status"
    echo "  Response: $response_body"
    
    if [ "$http_status" -eq "$expected_status" ]; then
        echo -e "  ${GREEN}✅ Test passed${NC}"
        return 0
    else
        echo -e "  ${RED}❌ Test failed (expected $expected_status, got $http_status)${NC}"
        return 1
    fi
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${YELLOW}1. Testing Retell Webhook Function${NC}"
echo "=====================================."

# Test 1: Valid webhook call_started event
if test_function \
    "Call Started Event" \
    "${BASE_URL}/retell-webhook" \
    "POST" \
    "-H 'Content-Type: application/json' -H 'x-retell-signature: ${RETELL_WEBHOOK_SECRET:-test-secret}'" \
    '{
        "event_type": "call_started",
        "data": {
            "call_id": "test-call-123",
            "agent_id": "test-agent-456",
            "direction": "outbound",
            "from_number": "+1234567890",
            "to_number": "+0987654321",
            "start_timestamp": 1640995200
        }
    }' \
    200; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""

# Test 2: Valid webhook call_ended event
if test_function \
    "Call Ended Event" \
    "${BASE_URL}/retell-webhook" \
    "POST" \
    "-H 'Content-Type: application/json' -H 'x-retell-signature: ${RETELL_WEBHOOK_SECRET:-test-secret}'" \
    '{
        "event_type": "call_ended",
        "data": {
            "call_id": "test-call-123",
            "call_status": "completed",
            "end_timestamp": 1640995500,
            "duration": 300,
            "cost": 0.05
        }
    }' \
    200; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""

# Test 3: Invalid webhook signature
if test_function \
    "Invalid Signature" \
    "${BASE_URL}/retell-webhook" \
    "POST" \
    "-H 'Content-Type: application/json' -H 'x-retell-signature: invalid-signature'" \
    '{
        "event_type": "call_started",
        "data": {
            "call_id": "test-call-456"
        }
    }' \
    401; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""

# Test 4: OPTIONS request (CORS)
if test_function \
    "CORS Preflight" \
    "${BASE_URL}/retell-webhook" \
    "OPTIONS" \
    "" \
    "" \
    204; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${YELLOW}2. Testing Campaign Trigger Function${NC}"
echo "===================================="

# Test 5: Start campaign (will fail without valid campaign ID, but should return 500 not 404)
if test_function \
    "Start Campaign" \
    "${BASE_URL}/campaign-trigger" \
    "POST" \
    "-H 'Content-Type: application/json'" \
    '{
        "action": "start_campaign",
        "campaign_id": "test-campaign-123"
    }' \
    500; then  # Expecting 500 because campaign doesn't exist
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""

# Test 6: Invalid action
if test_function \
    "Invalid Action" \
    "${BASE_URL}/campaign-trigger" \
    "POST" \
    "-H 'Content-Type: application/json'" \
    '{
        "action": "invalid_action"
    }' \
    400; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""

# Test 7: Missing campaign_id for action that requires it
if test_function \
    "Missing Campaign ID" \
    "${BASE_URL}/campaign-trigger" \
    "POST" \
    "-H 'Content-Type: application/json'" \
    '{
        "action": "start_campaign"
    }' \
    400; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""

# Test 8: Schedule check (should work even without campaigns)
if test_function \
    "Schedule Check" \
    "${BASE_URL}/campaign-trigger" \
    "POST" \
    "-H 'Content-Type: application/json'" \
    '{
        "action": "schedule_check"
    }' \
    200; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${YELLOW}3. Testing Function Availability${NC}"
echo "================================="

# Test 9: Health check - ensure functions are deployed
if curl -s -f "${BASE_URL}/retell-webhook" -X OPTIONS > /dev/null 2>&1; then
    echo -e "${GREEN}✅ retell-webhook function is available${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ retell-webhook function is not available${NC}"
    ((TESTS_FAILED++))
fi

if curl -s -f "${BASE_URL}/campaign-trigger" -X OPTIONS > /dev/null 2>&1; then
    echo -e "${GREEN}✅ campaign-trigger function is available${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ campaign-trigger function is not available${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "========================================="
echo -e "${YELLOW}📊 Test Results${NC}"
echo "========================================="
echo -e "${GREEN}✅ Tests passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}❌ Tests failed: ${TESTS_FAILED}${NC}"
echo -e "Total tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Edge Functions are working correctly.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some tests failed. Please check the function deployment and configuration.${NC}"
    
    if [ "$ENV" = "local" ]; then
        echo ""
        echo -e "${YELLOW}💡 For local testing, make sure you have:${NC}"
        echo "  1. Started Supabase locally: pnpm functions:dev"
        echo "  2. Set environment variables in .env.local"
        echo "  3. Deployed functions locally: supabase functions deploy"
    else
        echo ""
        echo -e "${YELLOW}💡 For remote testing, make sure you have:${NC}"
        echo "  1. Deployed functions: pnpm functions:deploy"
        echo "  2. Set environment variables in Supabase dashboard"
        echo "  3. Correct project reference in script"
    fi
    
    exit 1
fi