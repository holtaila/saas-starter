import { getServiceSupabase } from '@/lib/supabase/utils';

async function checkAgentStructure() {
  const supabase = getServiceSupabase();
  
  console.log('🤖 Checking agents table structure...\n');

  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
    
    if (!error && agents?.[0]) {
      console.log('✅ Agent table columns:');
      Object.keys(agents[0]).sort().forEach((key) => {
        const value = agents[0][key];
        const type = typeof value;
        const displayValue = value === null ? 'null' : 
                           type === 'string' ? `"${value}"` : 
                           type === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : 
                           value;
        console.log(`  - ${key}: ${type} = ${displayValue}`);
      });
    } else {
      console.log('❌ Error or no agents found:', error?.message || 'No data');
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  // Also check phone_numbers for call-related fields
  console.log('\n📞 Checking phone_numbers structure...');
  try {
    const { data: phones, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .limit(1);
    
    if (!error && phones?.[0]) {
      console.log('✅ Phone numbers columns:');
      Object.keys(phones[0]).sort().forEach((key) => {
        const value = phones[0][key];
        const type = typeof value;
        const displayValue = value === null ? 'null' : 
                           type === 'string' ? `"${value}"` : 
                           type === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : 
                           value;
        console.log(`  - ${key}: ${type} = ${displayValue}`);
      });
    } else {
      console.log('❌ Error or no phone numbers found:', error?.message || 'No data');
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  console.log('\n✅ Structure check complete!');
}

checkAgentStructure().catch(console.error);