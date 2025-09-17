import { getServiceSupabase } from '@/lib/supabase/utils';

async function checkRealSchema() {
  const supabase = getServiceSupabase();
  
  console.log('🔍 Checking actual database tables...\n');

  // Get all tables using information_schema
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (tablesError) {
    console.error('❌ Error fetching tables:', tablesError);
    return;
  }

  console.log('📋 Available tables:');
  if (tables) {
    tables.forEach((table: any) => {
      console.log(`  ✅ ${table.table_name}`);
    });
  }

  // Check specifically for phone-related tables
  const phoneRelatedTables = tables?.filter((table: any) => 
    table.table_name.includes('phone') || 
    table.table_name.includes('organization_phone')
  );

  console.log('\n📞 Phone-related tables:');
  if (phoneRelatedTables && phoneRelatedTables.length > 0) {
    phoneRelatedTables.forEach((table: any) => {
      console.log(`  ✅ ${table.table_name}`);
    });
  } else {
    console.log('  ❌ No phone-related tables found');
  }

  // Test simple query on organization_phone_assignments if it exists
  try {
    const { data: testData, error: testError } = await supabase
      .from('organization_phone_assignments')
      .select('*')
      .limit(1);
    
    if (!testError) {
      console.log('\n✅ organization_phone_assignments table is accessible');
      console.log('Sample record keys:', testData?.[0] ? Object.keys(testData[0]) : 'No records');
    } else {
      console.log('\n❌ organization_phone_assignments table error:', testError.message);
    }
  } catch (error) {
    console.log('\n❌ Cannot access organization_phone_assignments:', error);
  }

  // Test simple query on phone_numbers
  try {
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .limit(1);
    
    if (!phoneError) {
      console.log('\n✅ phone_numbers table is accessible');
      console.log('Sample record keys:', phoneData?.[0] ? Object.keys(phoneData[0]) : 'No records');
    } else {
      console.log('\n❌ phone_numbers table error:', phoneError.message);
    }
  } catch (error) {
    console.log('\n❌ Cannot access phone_numbers:', error);
  }

  console.log('\n✅ Database schema check complete!');
}

checkRealSchema().catch(console.error);