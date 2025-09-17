import { getServiceSupabase } from '@/lib/supabase/utils';

async function testDirectTables() {
  const supabase = getServiceSupabase();
  
  console.log('🔍 Testing direct table access...\n');

  // Test organization_phone_assignments
  console.log('📞 Testing organization_phone_assignments...');
  try {
    const { data, error } = await supabase
      .from('organization_phone_assignments')
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log('✅ organization_phone_assignments table EXISTS and is accessible');
      console.log('Columns:', data?.[0] ? Object.keys(data[0]) : 'No records yet');
      console.log('Record count in first fetch:', data?.length || 0);
    } else {
      console.log('❌ organization_phone_assignments error:', error.message);
      console.log('Error code:', error.code);
    }
  } catch (error) {
    console.log('❌ Exception accessing organization_phone_assignments:', error);
  }

  // Test phone_numbers
  console.log('\n📱 Testing phone_numbers...');
  try {
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log('✅ phone_numbers table EXISTS and is accessible');
      console.log('Columns:', data?.[0] ? Object.keys(data[0]) : 'No records yet');
      console.log('Record count in first fetch:', data?.length || 0);
    } else {
      console.log('❌ phone_numbers error:', error.message);
      console.log('Error code:', error.code);
    }
  } catch (error) {
    console.log('❌ Exception accessing phone_numbers:', error);
  }

  // Test other tables we know should exist
  const knownTables = ['organizations', 'profiles', 'agents', 'calls'];
  
  for (const tableName of knownTables) {
    console.log(`\n🗃️  Testing ${tableName}...`);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ ${tableName} table EXISTS`);
        console.log('Columns:', data?.[0] ? Object.keys(data[0]) : 'No records yet');
      } else {
        console.log(`❌ ${tableName} error:`, error.message);
      }
    } catch (error) {
      console.log(`❌ Exception accessing ${tableName}:`, error);
    }
  }

  console.log('\n✅ Direct table access test complete!');
}

testDirectTables().catch(console.error);