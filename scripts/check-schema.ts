import { getServiceSupabase } from '../lib/supabase/utils'

async function checkTableExists(tableName: string) {
  const supabase = getServiceSupabase()
  
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact' })
      .limit(1)
    
    return error === null
  } catch {
    return false
  }
}

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...')
  
  // Tables that should exist (from setup-supabase.sql)
  const expectedTables = [
    'organizations',
    'profiles', 
    'agents',
    'calls',
    'appointments',
    'call_campaigns',
    'email_preferences',
    'agent_templates',
    'impersonation_logs'
  ]
  
  console.log('\n📋 Checking core tables:')
  
  for (const table of expectedTables) {
    const exists = await checkTableExists(table)
    if (exists) {
      console.log(`✅ ${table}: EXISTS`)
    } else {
      console.log(`❌ ${table}: NOT EXISTS`)
    }
  }
  
  // Additional tables needed for complete implementation
  const requiredTables = [
    'phone_numbers',
    'organization_phone_assignments',
    'batch_calls',
    'zoho_credentials',
    'zoho_tokens', 
    'booking_requests',
    'zoho_services',
    'zoho_staff',
    'usage_history'
  ]
  
  console.log('\n📋 Checking additional required tables:')
  
  const missingTables = []
  
  for (const table of requiredTables) {
    const exists = await checkTableExists(table)
    if (exists) {
      console.log(`✅ ${table}: EXISTS`)
    } else {
      console.log(`❌ ${table}: NOT EXISTS - will create`)
      missingTables.push(table)
    }
  }
  
  console.log(`\n📊 Summary: ${missingTables.length} tables need to be created`)
  
  if (missingTables.length > 0) {
    console.log('Missing tables:', missingTables.join(', '))
  }
  
  return missingTables
}

checkDatabaseSchema().then((missingTables) => {
  console.log('\n✅ Schema check complete!')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Schema check failed:', error)
  process.exit(1)
})