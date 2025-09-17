import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

async function commentOldImports() {
  console.log('📝 Commenting out old action imports...')
  
  const filesToUpdate = [
    'app/(dashboard)/dashboard/security/page.tsx',
    'app/(dashboard)/dashboard/general/page.tsx', 
    'app/(dashboard)/dashboard/page.tsx',
    'app/(dashboard)/layout.tsx',
    'app/(login)/login.tsx',
    'app/(dashboard)/pricing/page.tsx'
  ]
  
  for (const file of filesToUpdate) {
    const fullPath = join(process.cwd(), file)
    try {
      let content = readFileSync(fullPath, 'utf8')
      let modified = false
      
      // Comment out imports from old actions
      if (content.includes("from '@/app/(login)/actions'") || content.includes("from './actions'")) {
        content = content.replace(
          /import\s+{[^}]+}\s+from\s+['"]@\/app\/\(login\)\/actions['"];?/g, 
          '// TODO: Update to use Supabase auth actions\n// $&'
        )
        content = content.replace(
          /import\s+{[^}]+}\s+from\s+['"]\.\/actions['"];?/g, 
          '// TODO: Update to use Supabase auth actions\n// $&'
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
  
  console.log('\n✅ Old import commenting complete!')
}

commentOldImports().catch(console.error)