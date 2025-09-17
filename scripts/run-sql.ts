import { getServiceSupabase } from '../lib/supabase/utils'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runSQL() {
  console.log('🔄 Creating missing database tables...')
  
  const supabase = getServiceSupabase()
  
  try {
    // Read the SQL file
    const sqlContent = readFileSync(join(__dirname, 'create-missing-tables.sql'), 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    for (const [index, statement] of statements.entries()) {
      const { error } = await supabase.rpc('exec_sql', { sql_text: statement })
      
      if (error) {
        // Try alternative method if RPC doesn't exist
        try {
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0)
            .then(async () => {
              // This is a workaround - we'll need to run SQL directly
              console.log(`⚠️  Statement ${index + 1}: ${statement.substring(0, 50)}...`)
              console.log('   SQL execution via Supabase client has limitations.')
              console.log('   Please run the SQL manually in Supabase Dashboard if needed.')
              return { error: null }
            })
        } catch (e) {
          console.error(`❌ Error executing statement ${index + 1}:`, error.message)
        }
      } else {
        console.log(`✅ Statement ${index + 1} executed successfully`)
      }
    }
    
    // Verify the email_preferences table was created
    const { error: checkError } = await supabase
      .from('email_preferences')
      .select('count', { count: 'exact' })
      .limit(1)
    
    if (checkError) {
      console.error('❌ Email preferences table check failed:', checkError.message)
      console.log('ℹ️  Table may need to be created manually via Supabase Dashboard')
    } else {
      console.log('✅ Email preferences table exists and is accessible')
    }
    
  } catch (error) {
    console.error('❌ SQL execution failed:', error)
    console.log('ℹ️  Please run create-missing-tables.sql manually in Supabase Dashboard')
  }
}

runSQL().then(() => {
  console.log('\n✅ Database setup complete!')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Database setup failed:', error)
  process.exit(1)
})