import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runCampaignsSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-campaigns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Creating campaigns tables...');

    // Split the SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      if (statement.includes('--') || statement.length < 10) continue; // Skip comments and very short statements
      
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error('Error executing statement:', error.message);
        console.error('Statement:', statement);
        // Continue with other statements
      } else {
        console.log('✓ Statement executed successfully');
      }
    }

    console.log('Campaigns setup completed!');

    // Test the tables by checking if they exist
    console.log('\nTesting table creation...');
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('count(*)')
      .limit(1);

    if (campaignsError) {
      console.error('Error testing campaigns table:', campaignsError.message);
    } else {
      console.log('✓ Campaigns table is accessible');
    }

    const { data: contacts, error: contactsError } = await supabase
      .from('campaign_contacts')
      .select('count(*)')
      .limit(1);

    if (contactsError) {
      console.error('Error testing campaign_contacts table:', contactsError.message);
    } else {
      console.log('✓ Campaign contacts table is accessible');
    }

  } catch (error) {
    console.error('Error setting up campaigns:', error);
    process.exit(1);
  }
}

runCampaignsSetup();