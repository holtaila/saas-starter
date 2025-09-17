#!/usr/bin/env tsx

import { CSVParser } from '../lib/csv-parser';
import { RetellVariableExtractor } from '../lib/retell-variable-extractor';

// Test cases for CSV parsing
const testCases = [
  {
    name: 'Basic CSV parsing',
    csv: `phone_number,crm_id,name,company
+14155551234,CRM001,John Doe,Acme Corp
+14155551235,CRM002,Jane Smith,Beta Inc`,
    expected: {
      success: true,
      contactCount: 2
    }
  },
  {
    name: 'CSV with quoted values containing commas',
    csv: `phone_number,crm_id,name,company,notes
+14155551234,CRM001,"Doe, John","Acme Corp, LLC","Important client, handle with care"
+14155551235,CRM002,Jane Smith,Beta Inc,Regular customer`,
    expected: {
      success: true,
      contactCount: 2
    }
  },
  {
    name: 'CSV with escaped quotes',
    csv: `phone_number,crm_id,name,company,quote
+14155551234,CRM001,John Doe,Acme Corp,"He said ""Hello World"" to me"
+14155551235,CRM002,Jane Smith,Beta Inc,"She replied ""Good morning"""`,
    expected: {
      success: true,
      contactCount: 2
    }
  },
  {
    name: 'Phone number auto-formatting - US numbers without country code',
    csv: `phone_number,crm_id,name
4155551234,CRM001,John Doe
(415) 555-1235,CRM002,Jane Smith
415-555-1236,CRM003,Bob Johnson`,
    expected: {
      success: true,
      contactCount: 3,
      expectedPhones: ['+14155551234', '+14155551235', '+14155551236']
    }
  },
  {
    name: 'Phone number auto-formatting - International numbers',
    csv: `phone_number,crm_id,name
442071234567,CRM001,London User
33123456789,CRM002,Paris User
+81312345678,CRM003,Tokyo User`,
    expected: {
      success: true,
      contactCount: 3,
      expectedPhones: ['+442071234567', '+33123456789', '+81312345678']
    }
  },
  {
    name: 'Test number detection and rejection',
    csv: `phone_number,crm_id,name
+15551234567,CRM001,Test User
+11234567890,CRM002,Another Test
+10001234567,CRM003,Fake Number`,
    expected: {
      success: false,
      errorCount: 3
    }
  },
  {
    name: 'Missing required columns',
    csv: `name,company
John Doe,Acme Corp
Jane Smith,Beta Inc`,
    expected: {
      success: false,
      errorContains: 'Missing required columns'
    }
  },
  {
    name: 'Invalid phone numbers',
    csv: `phone_number,crm_id,name
invalid,CRM001,John Doe
123,CRM002,Jane Smith
,CRM003,Bob Johnson`,
    expected: {
      success: false,
      errorCount: 3
    }
  },
  {
    name: 'Mixed valid and invalid data',
    csv: `phone_number,crm_id,name,email,company
+14155551234,CRM001,John Doe,john@example.com,Acme Corp
invalid_phone,CRM002,Jane Smith,jane@example.com,Beta Inc
+14155551236,CRM003,Bob Johnson,bob@example.com,Gamma Ltd`,
    expected: {
      success: false,
      errorCount: 1,
      partialSuccess: true
    }
  },
  {
    name: 'Dynamic variables extraction',
    csv: `phone_number,crm_id,first_name,last_name,email,company,purchase_amount,is_premium
+14155551234,CRM001,John,Doe,john@example.com,Acme Corp,299.99,true
+14155551235,CRM002,Jane,Smith,jane@example.com,Beta Inc,150.00,false`,
    expected: {
      success: true,
      contactCount: 2,
      dynamicVariables: ['first_name', 'last_name', 'email', 'company', 'purchase_amount', 'is_premium']
    }
  }
];

function runTests() {
  console.log('🧪 Running CSV Parsing Tests\n');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      // Parse CSV
      const result = CSVParser.parseCSV(testCase.csv);
      
      // Check basic success/failure
      if (result.success !== testCase.expected.success) {
        console.log(`❌ FAIL: Expected success=${testCase.expected.success}, got success=${result.success}`);
        if (result.errors) {
          console.log(`   Errors: ${result.errors.join(', ')}`);
        }
        continue;
      }

      if (testCase.expected.success) {
        // Test successful parsing
        if (!result.data) {
          console.log(`❌ FAIL: Expected data but got none`);
          continue;
        }

        if (testCase.expected.contactCount && result.data.length !== testCase.expected.contactCount) {
          console.log(`❌ FAIL: Expected ${testCase.expected.contactCount} contacts, got ${result.data.length}`);
          continue;
        }

        // Check phone number formatting
        if (testCase.expected.expectedPhones) {
          const actualPhones = result.data.map(contact => contact.phone_number);
          const expectedPhones = testCase.expected.expectedPhones;
          
          for (let j = 0; j < expectedPhones.length; j++) {
            if (actualPhones[j] !== expectedPhones[j]) {
              console.log(`❌ FAIL: Expected phone ${expectedPhones[j]}, got ${actualPhones[j]}`);
              continue;
            }
          }
        }

        // Test variable extraction
        if (testCase.expected.dynamicVariables) {
          const { variables } = RetellVariableExtractor.extractVariablesFromContacts(
            result.data,
            'test_agent_id',
            'test_org_id'
          );

          const dynamicVarNames = variables
            .filter(v => RetellVariableExtractor.isDynamicVariable(v.name))
            .map(v => v.name)
            .sort();

          const expectedVarNames = testCase.expected.dynamicVariables.sort();
          
          if (JSON.stringify(dynamicVarNames) !== JSON.stringify(expectedVarNames)) {
            console.log(`❌ FAIL: Expected dynamic variables ${expectedVarNames.join(', ')}, got ${dynamicVarNames.join(', ')}`);
            continue;
          }

          console.log(`   📊 Variables extracted: ${dynamicVarNames.join(', ')}`);
          console.log(`   📝 Sample values:`);
          variables.slice(0, 3).forEach(v => {
            console.log(`      ${v.name}: "${v.sample_value}"`);
          });
        }

        console.log(`   📞 Parsed ${result.data.length} contacts successfully`);
        if (result.data.length > 0) {
          console.log(`   📋 Sample contact: ${result.data[0].phone_number} (${result.data[0].crm_id})`);
        }

      } else {
        // Test failure cases
        if (!result.errors || result.errors.length === 0) {
          console.log(`❌ FAIL: Expected errors but got none`);
          continue;
        }

        if (testCase.expected.errorCount && result.errors.length !== testCase.expected.errorCount) {
          console.log(`❌ FAIL: Expected ${testCase.expected.errorCount} errors, got ${result.errors.length}`);
          continue;
        }

        if (testCase.expected.errorContains) {
          const hasExpectedError = result.errors.some(error => 
            error.includes(testCase.expected.errorContains!)
          );
          if (!hasExpectedError) {
            console.log(`❌ FAIL: Expected error containing "${testCase.expected.errorContains}"`);
            console.log(`   Actual errors: ${result.errors.join(', ')}`);
            continue;
          }
        }

        console.log(`   ⚠️ Failed as expected: ${result.errors.slice(0, 2).join(', ')}`);
        if (result.errors.length > 2) {
          console.log(`   ... and ${result.errors.length - 2} more errors`);
        }
      }

      console.log(`✅ PASS`);
      passedTests++;

    } catch (error) {
      console.log(`❌ FAIL: Unexpected error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${totalTests - passedTests} tests failed`);
    process.exit(1);
  }
}

// Additional manual tests
function runManualTests() {
  console.log('\n🔧 Running Manual Tests\n');
  console.log('=' .repeat(60));

  // Test 1: Phone number validation edge cases
  console.log('\n📱 Phone Number Validation Edge Cases:');
  const phoneTests = [
    '+14155551234',      // Already formatted
    '14155551234',       // US with country code
    '4155551234',        // US without country code
    '1-415-555-1234',    // US formatted
    '(415) 555-1234',    // US with parentheses
    '+442071234567',     // UK number
    '+33123456789',      // French number
    '+81312345678',      // Japanese number
    '123',               // Too short
    'abc123def',         // Contains letters
    '+15551234567',      // Test number
  ];

  phoneTests.forEach(phone => {
    const testCsv = `phone_number,crm_id\n${phone},CRM001`;
    const result = CSVParser.parseCSV(testCsv);
    const status = result.success ? '✅' : '❌';
    const formatted = result.success && result.data ? result.data[0].phone_number : 'N/A';
    console.log(`   ${status} ${phone.padEnd(15)} → ${formatted}`);
  });

  // Test 2: Variable extraction
  console.log('\n📊 Variable Extraction Test:');
  const variableTestCsv = `phone_number,crm_id,first_name,last_name,company,email,age,purchase_date,amount,is_vip
+14155551234,CRM001,John,Doe,Acme Corp,john@acme.com,35,2024-01-15,299.99,true`;
  
  const result = CSVParser.parseCSV(variableTestCsv);
  if (result.success && result.data) {
    const { variables, sampleContact } = RetellVariableExtractor.extractVariablesFromContacts(
      result.data,
      'agent_123',
      'org_456'
    );

    console.log('   📋 All Variables:');
    variables.forEach(v => {
      const type = RetellVariableExtractor.isDynamicVariable(v.name) ? 'Dynamic' : 'System';
      console.log(`      ${type.padEnd(8)} | ${v.name.padEnd(15)} | ${v.sample_value}`);
    });

    console.log('\n   🎯 Sample Contact for Retell:');
    Object.entries(sampleContact).forEach(([key, value]) => {
      console.log(`      ${key.padEnd(15)} : ${value}`);
    });
  }

  console.log('\n✅ Manual tests completed');
}

// Run all tests
if (require.main === module) {
  runTests();
  runManualTests();
}