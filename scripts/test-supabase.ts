import { getServiceSupabase } from '../lib/supabase/utils'

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...')
  
  try {
    const supabase = getServiceSupabase()
    
    // Test basic connection
    const { data, error } = await supabase
      .from('organizations')
      .select('count', { count: 'exact' })
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      
      if (error.message.includes('relation "organizations" does not exist')) {
        console.log('📋 Organizations table does not exist yet. Schema needs to be set up.')
        return false
      }
      
      throw error
    }
    
    console.log('✅ Supabase connection successful!')
    console.log(`📊 Organizations table exists with ${data?.[0]?.count || 0} records`)
    return true
    
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

testSupabaseConnection().then((success) => {
  process.exit(success ? 0 : 1)
})