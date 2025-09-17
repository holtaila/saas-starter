import { getServiceSupabase } from '@/lib/supabase/utils';

async function checkRealSchema() {
  const supabase = getServiceSupabase();
  
  console.log('🔍 Checking actual database tables...\n');

  // Get all tables in the public schema
  const { data: tables, error: tablesError } = await supabase
    .rpc('sql', {
      query: `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

  if (tablesError) {
    console.error('❌ Error fetching tables:', tablesError);
    return;
  }

  console.log('📋 Available tables:');
  if (tables) {
    tables.forEach((table: any) => {
      console.log(`  ✅ ${table.tablename}`);
    });
  }

  // Check if organization_phone_assignments exists specifically
  const { data: orgPhoneTable } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'organization_phone_assignments')
    .single();

  console.log('\n🔍 Checking organization_phone_assignments table...');
  if (orgPhoneTable) {
    console.log('✅ organization_phone_assignments table EXISTS');
    
    // Get the structure
    const { data: columns } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'organization_phone_assignments'
          ORDER BY ordinal_position;
        `
      });
    
    console.log('📋 Table structure:');
    if (columns) {
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ''}`);
      });
    }
  } else {
    console.log('❌ organization_phone_assignments table does NOT exist');
  }

  // Check if phone_numbers exists and its structure
  console.log('\n🔍 Checking phone_numbers table...');
  const { data: phoneColumns } = await supabase
    .rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_numbers'
        ORDER BY ordinal_position;
      `
    });
  
  if (phoneColumns && phoneColumns.length > 0) {
    console.log('✅ phone_numbers table structure:');
    phoneColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ''}`);
    });
  } else {
    console.log('❌ phone_numbers table does not exist or is empty');
  }

  console.log('\n✅ Database schema check complete!');
}

checkRealSchema().catch(console.error);