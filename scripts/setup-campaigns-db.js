const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function setupCampaignsTables() {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;

  if (!connectionString) {
    console.error('Missing SUPABASE_CONNECTION_STRING in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-campaigns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing campaigns setup SQL...');

    // Execute the entire SQL content
    await client.query(sqlContent);

    console.log('✓ Campaigns tables created successfully!');

    // Test the tables
    console.log('\nTesting table creation...');
    
    const campaignsResult = await client.query('SELECT COUNT(*) FROM campaigns');
    console.log('✓ Campaigns table accessible - count:', campaignsResult.rows[0].count);

    const contactsResult = await client.query('SELECT COUNT(*) FROM campaign_contacts');
    console.log('✓ Campaign contacts table accessible - count:', contactsResult.rows[0].count);

    console.log('\n🎉 Campaigns setup completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Create campaigns with CSV uploads');
    console.log('2. Manage campaign contacts');
    console.log('3. Track call campaign progress');

  } catch (error) {
    console.error('Error setting up campaigns:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupCampaignsTables();