interface ParsedContact {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  [key: string]: string;
}

interface CSVParseResult {
  success: boolean;
  data?: ParsedContact[];
  errors?: string[];
  headers?: string[];
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export class CSVParser {
  private static readonly REQUIRED_COLUMNS = ['name', 'phone'];
  private static readonly TEST_NUMBER_PATTERNS = [
    /^\+1555\d{7}$/,  // +1555XXXXXXX
    /^\+1123\d{7}$/,  // +1123XXXXXXX  
    /^\+1000\d{7}$/,  // +1000XXXXXXX
  ];

  // Column name mappings - maps various column names to our standardized names
  private static readonly COLUMN_MAPPINGS: Record<string, string[]> = {
    'phone': ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'tel'],
    'name': ['name', 'first_name', 'full_name', 'contact_name', 'customer_name'],
    'email': ['email', 'email_address', 'contact_email'],
    'company': ['company', 'organization', 'business', 'employer'],
    'notes': ['notes', 'comments', 'description', 'memo']
  };

  // Find the best matching column from available headers
  private static findColumnMatch(targetColumn: string, availableHeaders: string[]): string | null {
    const possibleNames = this.COLUMN_MAPPINGS[targetColumn] || [targetColumn];
    
    for (const possibleName of possibleNames) {
      const match = availableHeaders.find(header => 
        header.toLowerCase().trim() === possibleName.toLowerCase()
      );
      if (match) {
        return match;
      }
    }
    
    return null;
  }

  static parseCSV(csvContent: string): CSVParseResult {
    try {
      const lines = this.parseCSVLines(csvContent);
      
      if (lines.length === 0) {
        return {
          success: false,
          errors: ['CSV file is empty']
        };
      }

      // Extract and normalize headers
      const headers = lines[0].map(header => header.toLowerCase().trim());
      const dataRows = lines.slice(1);

      // Create column mapping - find which actual columns map to our required ones
      const columnMap: Record<string, string> = {};
      const missingColumns: string[] = [];

      for (const requiredColumn of this.REQUIRED_COLUMNS) {
        const matchedColumn = this.findColumnMatch(requiredColumn, headers);
        if (matchedColumn) {
          columnMap[requiredColumn] = matchedColumn;
        } else {
          missingColumns.push(requiredColumn);
        }
      }

      // Check if we found all required columns
      if (missingColumns.length > 0) {
        const suggestions = missingColumns.map(col => {
          const possibleNames = this.COLUMN_MAPPINGS[col] || [col];
          return `${col} (try: ${possibleNames.join(', ')})`;
        });
        return {
          success: false,
          errors: [`Missing required columns: ${suggestions.join('; ')}`]
        };
      }

      // Process and validate contacts
      const contacts: ParsedContact[] = [];
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because of header row and 0-based index

        if (row.length !== headers.length) {
          errors.push(`Row ${rowNumber}: Column count mismatch (expected ${headers.length}, got ${row.length})`);
          continue;
        }

        // Create contact object
        const contact: ParsedContact = { name: '', phone: '' };
        const validationErrors: ValidationError[] = [];

        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          const value = row[j].trim();

          // Check if this column maps to phone
          if (header === columnMap['phone']) {
            const phoneResult = this.validateAndFormatPhoneNumber(value);
            if (!phoneResult.valid) {
              validationErrors.push({
                row: rowNumber,
                field: header,
                value: value,
                message: phoneResult.error || 'Invalid phone number'
              });
            } else {
              contact.phone = phoneResult.formatted!;
            }
          }
          // Check if this column maps to name
          else if (header === columnMap['name']) {
            if (!value) {
              validationErrors.push({
                row: rowNumber,
                field: header,
                value: value,
                message: 'Name is required'
              });
            } else {
              contact.name = value;
            }
          }
          // Check for standard optional fields
          else if (header === this.findColumnMatch('email', [header])) {
            contact.email = value;
          }
          else if (header === this.findColumnMatch('company', [header])) {
            contact.company = value;
          }
          else if (header === this.findColumnMatch('notes', [header])) {
            contact.notes = value;
          }
          // All other columns become dynamic variables
          else {
            contact[header] = value;
          }
        }

        // Check for validation errors
        if (validationErrors.length > 0) {
          for (const error of validationErrors) {
            errors.push(`Row ${error.row}, ${error.field}: ${error.message} (value: "${error.value}")`);
          }
          continue;
        }

        contacts.push(contact);
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors,
          headers
        };
      }

      return {
        success: true,
        data: contacts,
        headers
      };

    } catch (error) {
      return {
        success: false,
        errors: [`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static parseCSVLines(csvContent: string): string[][] {
    const lines: string[][] = [];
    const rows = csvContent.split('\n').filter(line => line.trim() !== '');
    
    for (const row of rows) {
      const columns = this.parseCSVRow(row);
      lines.push(columns);
    }
    
    return lines;
  }

  private static parseCSVRow(row: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote: "" becomes "
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of column
        columns.push(current.trim());
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }

    // Add the last column
    columns.push(current.trim());
    
    return columns;
  }

  private static validateAndFormatPhoneNumber(phone: string): {
    valid: boolean;
    formatted?: string;
    error?: string;
  } {
    if (!phone || phone.trim() === '') {
      return {
        valid: false,
        error: 'Phone number is required'
      };
    }

    // Remove all non-digit characters except + at the start
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('+')) {
      // Already has country code
    } else if (cleaned.length === 10) {
      // US number without country code
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // US number with 1 prefix
      cleaned = '+' + cleaned;
    } else if (cleaned.length >= 10) {
      // International number without +
      cleaned = '+' + cleaned;
    } else {
      return {
        valid: false,
        error: 'Invalid phone number format'
      };
    }

    // Validate E.164 format (+ followed by 1-15 digits)
    if (!/^\+\d{1,15}$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Invalid phone number format'
      };
    }

    // Check for test numbers
    for (const pattern of this.TEST_NUMBER_PATTERNS) {
      if (pattern.test(cleaned)) {
        return {
          valid: false,
          error: 'Test/fake phone numbers are not allowed'
        };
      }
    }

    return {
      valid: true,
      formatted: cleaned
    };
  }

  static validateContacts(contacts: ParsedContact[]): {
    valid: ParsedContact[];
    errors: string[];
  } {
    const valid: ParsedContact[] = [];
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const contactErrors: string[] = [];

      // Validate phone number
      const phoneResult = this.validateAndFormatPhoneNumber(contact.phone);
      if (!phoneResult.valid) {
        contactErrors.push(`Invalid phone number: ${phoneResult.error}`);
      } else {
        contact.phone = phoneResult.formatted!;
      }

      // Validate name
      if (!contact.name || contact.name.trim() === '') {
        contactErrors.push('Name is required');
      }

      if (contactErrors.length > 0) {
        errors.push(`Contact ${i + 1}: ${contactErrors.join(', ')}`);
      } else {
        valid.push(contact);
      }
    }

    return { valid, errors };
  }
}

export type { ParsedContact, CSVParseResult };