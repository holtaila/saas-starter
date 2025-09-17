#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const componentsDir = 'components/phone-numbers';

// Files to update
const filesToUpdate = [
  'phone-numbers-list.tsx',
  'edit-phone-number-dialog.tsx',
  'delete-phone-number-dialog.tsx',
  'assign-phone-number-dialog.tsx'
];

filesToUpdate.forEach(fileName => {
  const filePath = path.join(componentsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace old field names with new ones
  content = content.replace(/\.number/g, '.phone_number');
  content = content.replace(/\.provider/g, '.display_name');
  content = content.replace(/number:/g, 'phone_number:');
  content = content.replace(/provider:/g, 'display_name:');
  
  // Fix capabilities references
  content = content.replace(/\.capabilities\?/g, '.retell_phone_number_id ? [\'retell\'] : []');
  content = content.replace(/capabilities\?\.map/g, '[].map');
  
  // Fix updated_at references
  content = content.replace(/\.updated_at/g, '.created_at');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${filePath}`);
});

console.log('Phone components updated successfully!');