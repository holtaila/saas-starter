import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

async function commentOldSchemaImports() {
  console.log('📝 Commenting out old schema imports...')
  
  const filesToUpdate = [
    'app/layout.tsx',
    'app/(dashboard)/dashboard/general/page.tsx',
    'app/(dashboard)/dashboard/activity/page.tsx', 
    'app/(dashboard)/dashboard/page.tsx',
    'app/(dashboard)/layout.tsx'
  ]
  
  for (const file of filesToUpdate) {
    const fullPath = join(process.cwd(), file)
    try {
      let content = readFileSync(fullPath, 'utf8')
      let modified = false
      
      // Comment out imports from old schema/queries  
      if (content.includes("from '@/lib/db/schema'") || 
          content.includes("from '@/lib/db/queries'") ||
          content.includes("from '@/lib/auth/session'")) {
        
        content = content.replace(
          /import\s+{[^}]+}\s+from\s+['"]@\/lib\/db\/schema['"];?/g, 
          '// TODO: Update to use Supabase types\n// $&'
        )
        content = content.replace(
          /import\s+{[^}]+}\s+from\s+['"]@\/lib\/db\/queries['"];?/g, 
          '// TODO: Update to use Supabase queries\n// $&'
        )
        content = content.replace(
          /import\s+{[^}]+}\s+from\s+['"]@\/lib\/auth\/session['"];?/g, 
          '// TODO: Update to use Supabase auth\n// $&'
        )
        
        modified = true
        console.log(`  ✏️  Commented out imports in ${file.split('/').pop()}`)
      }
      
      if (modified) {
        writeFileSync(fullPath, content)
        console.log(`  ✅ Updated ${file.split('/').pop()}`)
      }
      
    } catch (error) {
      console.error(`  ❌ Error updating ${file}:`, (error as Error).message)
    }
  }
  
  console.log('\n✅ Old schema import commenting complete!')
}

commentOldSchemaImports().catch(console.error)