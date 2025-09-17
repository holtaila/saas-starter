#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const componentsDir = 'components/phone-numbers';

// Files to update
const filesToUpdate = [
  'edit-phone-number-dialog.tsx',
  'delete-phone-number-dialog.tsx',
  'phone-numbers-list.tsx'
];

filesToUpdate.forEach(fileName => {
  const filePath = path.join(componentsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix duplicate phone_number fields by renaming the nested one
  content = content.replace(/phone_number\?\:\s*{[^}]*phone_number:/g, match => {
    return match.replace('phone_number?:', 'nested_phone?:');
  });
  
  // Fix references to the nested phone_number
  content = content.replace(/phoneNumber\.phone_number\?\.phone_number/g, 'phoneNumber.nested_phone?.phone_number');
  content = content.replace(/phoneNumber\.phone_number\?\.display_name/g, 'phoneNumber.nested_phone?.display_name');
  content = content.replace(/phoneNumber\.phone_number\?\.status/g, 'phoneNumber.nested_phone?.status');
  content = content.replace(/phoneNumber\.phone_number\?\.id/g, 'phoneNumber.nested_phone?.id');
  
  // Fix the interface definitions that have duplicate phone_number
  content = content.replace(/phone_number\?\:\s*\{([^}]+)\}/g, (match, content) => {
    return 'nested_phone?: {' + content + '}';
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${filePath}`);
});

console.log('Duplicate fields fixed successfully!');