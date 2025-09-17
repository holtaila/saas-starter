#!/bin/bash

# Simple webhook testing script using curl
# This script sends test webhook payloads to the Retell webhook endpoint

set -e

# Configuration
SUPABASE_URL=${SUPABASE_URL:-"http://127.0.0.1:54321"}
RETELL_API_KEY=${RETELL_API_KEY:-"test-api-key"}
WEBHOOK_URL="$SUPABASE_URL/functions/v1/retell-webhook"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to create HMAC signature
create_signature() {
    local payload="$1"
    local api_key="$2"
    echo -n "$payload" | openssl dgst -sha256 -hmac "$api_key" -hex | cut -d' ' -f2
}

# Function to send webhook
send_webhook() {
    local payload="$1"
    local description="$2"
    
    echo -e "\n${BLUE}🧪 Testing: $description${NC}"
    echo "Payload: $payload"
    
    local signature=$(create_signature "$payload" "$RETELL_API_KEY")
    echo "Signature: $signature"
    
    local response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-retell-signature: $signature" \
        -d "$payload" \
        "$WEBHOOK_URL")
    
    local body=$(echo "$response" | sed '$d')
    local status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    
    echo "Status: $status"
    
    if [[ $status -ge 200 && $status -lt 300 ]]; then
        echo -e "${GREEN}✅ Success: $body${NC}"
    else
        echo -e "${RED}❌ Error: $body${NC}"
    fi
}

# Test payloads
call_started_payload() {
    local call_id="${1:-test-call-001}"
    local timestamp=$(date +%s)000
    cat <<EOF
{
  "event": "call_started",
  "call": {
    "call_id": "$call_id",
    "agent_id": "agent_001",
    "call_type": "phone_call",
    "from_number": "+1234567890",
    "to_number": "+1987654321",
    "direction": "outbound",
    "call_status": "ongoing",
    "start_timestamp": $timestamp,
    "metadata": {
      "campaign_id": "campaign-001",
      "contact_name": "John Doe"
    }
  }
}
EOF
}

call_ended_payload() {
    local call_id="${1:-test-call-001}"
    local start_time=$(($(date +%s) - 120))000
    local end_time=$(date +%s)000
    local duration=$((end_time - start_time))
    
    cat <<EOF
{
  "event": "call_ended",
  "call": {
    "call_id": "$call_id",
    "agent_id": "agent_001",
    "call_type": "phone_call",
    "from_number": "+1234567890",
    "to_number": "+1987654321",
    "direction": "outbound",
    "call_status": "ended",
    "start_timestamp": $start_time,
    "end_timestamp": $end_time,
    "duration_ms": $duration,
    "cost": 0.05,
    "recording_url": "https://example.com/recording.mp3",
    "disconnect_reason": "user_hangup",
    "metadata": {
      "campaign_id": "campaign-001",
      "contact_name": "John Doe"
    }
  }
}
EOF
}

call_analyzed_payload() {
    local call_id="${1:-test-call-001}"
    local start_time=$(($(date +%s) - 120))000
    local end_time=$(date +%s)000
    local duration=$((end_time - start_time))
    
    cat <<EOF
{
  "event": "call_analyzed",
  "call": {
    "call_id": "$call_id",
    "agent_id": "agent_001",
    "call_type": "phone_call",
    "from_number": "+1234567890",
    "to_number": "+1987654321",
    "direction": "outbound",
    "call_status": "ended",
    "start_timestamp": $start_time,
    "end_timestamp": $end_time,
    "duration_ms": $duration,
    "cost": 0.05,
    "recording_url": "https://example.com/recording.mp3",
    "transcript": "Hello, this is a test call transcript. How are you today? Great, thank you for your time.",
    "call_analysis": {
      "call_successful": true,
      "call_summary": "Successfully connected with the customer. They expressed interest in our product.",
      "in_voicemail": false,
      "user_sentiment": "Positive",
      "custom_analysis_data": {
        "intent": "interested",
        "next_action": "follow_up"
      }
    },
    "disconnect_reason": "user_hangup",
    "metadata": {
      "campaign_id": "campaign-001",
      "contact_name": "John Doe"
    }
  }
}
EOF
}

inbound_call_payload() {
    cat <<EOF
{
  "event": "call_inbound",
  "call_inbound": {
    "from_number": "+1555123456",
    "to_number": "+1987654321",
    "agent_id": "inbound_agent_001"
  }
}
EOF
}

# Usage function
usage() {
    cat <<EOF
Retell AI Webhook Tester (Simple)

Usage: $0 [options] [test_type]

Options:
  -h, --help     Show this help message
  -u, --url URL  Set webhook endpoint URL (default: $WEBHOOK_URL)
  -k, --key KEY  Set Retell API key for signature generation

Test Types:
  all            Run all tests (default)
  call_started   Test call started webhook
  call_ended     Test call ended webhook
  call_analyzed  Test call analyzed webhook
  inbound        Test inbound call webhook
  invalid_sig    Test invalid signature (should fail)

Environment Variables:
  SUPABASE_URL      Your Supabase project URL (default: http://127.0.0.1:54321)
  RETELL_API_KEY    Your Retell AI API key (default: test-api-key)

Examples:
  $0
  $0 inbound
  $0 -k your-real-api-key all
  RETELL_API_KEY=your-key $0 call_started
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -u|--url)
            WEBHOOK_URL="$2"
            shift 2
            ;;
        -k|--key)
            RETELL_API_KEY="$2"
            shift 2
            ;;
        -*)
            echo "Unknown option $1"
            usage
            exit 1
            ;;
        *)
            TEST_TYPE="$1"
            shift
            ;;
    esac
done

TEST_TYPE=${TEST_TYPE:-all}

echo -e "${YELLOW}🚀 Starting Retell AI Webhook Tests${NC}"
echo "Endpoint: $WEBHOOK_URL"
echo "API Key: ${RETELL_API_KEY:0:8}..."

# Check if curl and openssl are available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl is required but not installed.${NC}"
    exit 1
fi

if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ openssl is required but not installed.${NC}"
    exit 1
fi

# Run tests based on type
case $TEST_TYPE in
    all)
        call_id="test-$(date +%s)"
        send_webhook "$(call_started_payload "$call_id")" "Call Started Event"
        sleep 1
        send_webhook "$(call_ended_payload "$call_id")" "Call Ended Event"
        sleep 1
        send_webhook "$(call_analyzed_payload "$call_id")" "Call Analyzed Event"
        send_webhook "$(inbound_call_payload)" "Inbound Call Event"
        
        # Test invalid signature
        echo -e "\n${BLUE}🧪 Testing: Invalid Signature (Should Fail)${NC}"
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "x-retell-signature: invalid-signature" \
            -d "$(call_started_payload "invalid-$(date +%s)")" \
            "$WEBHOOK_URL")
        
        status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
        if [[ $status -eq 401 ]]; then
            echo -e "${GREEN}✅ Correctly rejected invalid signature${NC}"
        else
            echo -e "${RED}❌ Should have rejected invalid signature (got status: $status)${NC}"
        fi
        ;;
    call_started)
        send_webhook "$(call_started_payload)" "Call Started Event"
        ;;
    call_ended)
        send_webhook "$(call_ended_payload)" "Call Ended Event"
        ;;
    call_analyzed)
        send_webhook "$(call_analyzed_payload)" "Call Analyzed Event"
        ;;
    inbound)
        send_webhook "$(inbound_call_payload)" "Inbound Call Event"
        ;;
    invalid_sig)
        echo -e "\n${BLUE}🧪 Testing: Invalid Signature (Should Fail)${NC}"
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "x-retell-signature: invalid-signature" \
            -d "$(call_started_payload "invalid-$(date +%s)")" \
            "$WEBHOOK_URL")
        
        status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
        if [[ $status -eq 401 ]]; then
            echo -e "${GREEN}✅ Correctly rejected invalid signature${NC}"
        else
            echo -e "${RED}❌ Should have rejected invalid signature (got status: $status)${NC}"
        fi
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $TEST_TYPE${NC}"
        usage
        exit 1
        ;;
esac

echo -e "\n${YELLOW}🎉 Webhook tests completed!${NC}"