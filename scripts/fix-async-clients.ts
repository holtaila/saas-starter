import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

async function fixAsyncClients() {
  console.log('🔧 Fixing async client calls...')
  
  // Files to update
  const filesToUpdate = [
    'lib/db/queries/agents.ts',
    'lib/db/queries/calls.ts', 
    'lib/db/queries/campaigns.ts',
    'lib/db/queries/organizations.ts',
    'app/api/auth/sign-in/route.ts',
    'app/api/auth/sign-up/route.ts',
    'app/api/auth/sign-out/route.ts',
    'app/api/auth/ensure-profile/route.ts'
  ]
  
  console.log(`📁 Found ${filesToUpdate.length} files to update`)
  
  for (const file of filesToUpdate) {
    const fullPath = join(process.cwd(), file)
    try {
      let content = readFileSync(fullPath, 'utf8')
      let modified = false
      
      // Replace createClient() with await createClient()
      if (content.includes('const supabase = createClient()')) {
        content = content.replace(/const supabase = createClient\(\)/g, 'const supabase = await createClient()')
        modified = true
        console.log(`  ✏️  Updated createClient() calls in ${file.split('/').pop()}`)
      }
      
      // Replace getServerSupabase() with await getServerSupabase() 
      if (content.includes('const supabase = getServerSupabase()')) {
        content = content.replace(/const supabase = getServerSupabase\(\)/g, 'const supabase = await getServerSupabase()')
        modified = true
        console.log(`  ✏️  Updated getServerSupabase() calls in ${file.split('/').pop()}`)
      }
      
      if (modified) {
        writeFileSync(fullPath, content)
        console.log(`  ✅ Updated ${file.split('/').pop()}`)
      }
      
    } catch (error) {
      console.error(`  ❌ Error updating ${file}:`, (error as Error).message)
    }
  }
  
  console.log('\n✅ Async client fixes complete!')
}

fixAsyncClients().catch(console.error)