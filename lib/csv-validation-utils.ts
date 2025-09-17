import { CSVParser, ParsedContact } from './csv-parser';

export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    validContacts: number;
    duplicatePhones: number;
    duplicateCrmIds: number;
    invalidPhones: number;
    testNumbers: number;
    emptyFields: number;
  };
  preview: ParsedContact[];
}

export interface CSVHealthCheck {
  encoding: 'utf8' | 'latin1' | 'unknown';
  lineEndings: 'lf' | 'crlf' | 'mixed';
  delimiter: ',' | ';' | '\t' | 'unknown';
  hasHeaders: boolean;
  estimatedRows: number;
  fileSize: number;
  issues: string[];
}

export class CSVValidationUtils {
  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  static readonly MAX_CONTACTS = 10000; // Max contacts per batch
  static readonly SAMPLE_SIZE = 5; // Number of contacts to return in preview

  static performHealthCheck(csvContent: string): CSVHealthCheck {
    const issues: string[] = [];
    const fileSize = new Blob([csvContent]).size;

    // Check file size
    if (fileSize > this.MAX_FILE_SIZE) {
      issues.push(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // Detect line endings
    const hasLF = csvContent.includes('\n');
    const hasCRLF = csvContent.includes('\r\n');
    const hasCR = csvContent.includes('\r') && !hasCRLF;
    
    let lineEndings: 'lf' | 'crlf' | 'mixed' = 'lf';
    if (hasCRLF && hasLF && csvContent.split('\r\n').length !== csvContent.split('\n').length) {
      lineEndings = 'mixed';
      issues.push('Mixed line endings detected - this may cause parsing issues');
    } else if (hasCRLF) {
      lineEndings = 'crlf';
    } else if (hasCR) {
      issues.push('Mac classic line endings (CR only) detected - this may cause parsing issues');
    }

    // Estimate encoding (basic check)
    let encoding: 'utf8' | 'latin1' | 'unknown' = 'utf8';
    try {
      // Check for common non-UTF8 characters
      if (/[\x80-\xFF]/.test(csvContent) && !/[\u0100-\uFFFF]/.test(csvContent)) {
        encoding = 'latin1';
        issues.push('File appears to use Latin-1 encoding - UTF-8 is recommended');
      }
    } catch {
      encoding = 'unknown';
      issues.push('Unable to determine file encoding');
    }

    // Detect delimiter
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    let delimiter: ',' | ';' | '\t' | 'unknown' = 'unknown';
    
    if (lines.length > 0) {
      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;

      if (commaCount > semicolonCount && commaCount > tabCount) {
        delimiter = ',';
      } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
        delimiter = ';';
        issues.push('Semicolon delimiter detected - comma delimiter is preferred');
      } else if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
        issues.push('Tab delimiter detected - comma delimiter is preferred');
      }
    }

    // Check for headers
    const hasHeaders = lines.length > 1 && 
      lines[0].toLowerCase().includes('phone') && 
      lines[0].toLowerCase().includes('crm');

    if (!hasHeaders) {
      issues.push('No clear headers detected - ensure first row contains column names including "phone_number" and "crm_id"');
    }

    // Estimate row count
    const estimatedRows = Math.max(0, lines.length - (hasHeaders ? 1 : 0));
    
    if (estimatedRows > this.MAX_CONTACTS) {
      issues.push(`Estimated ${estimatedRows} contacts exceeds maximum allowed (${this.MAX_CONTACTS})`);
    }

    return {
      encoding,
      lineEndings,
      delimiter,
      hasHeaders,
      estimatedRows,
      fileSize,
      issues
    };
  }

  static validateCSVComprehensively(csvContent: string): CSVValidationResult {
    const result: CSVValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      stats: {
        totalRows: 0,
        validContacts: 0,
        duplicatePhones: 0,
        duplicateCrmIds: 0,
        invalidPhones: 0,
        testNumbers: 0,
        emptyFields: 0,
      },
      preview: []
    };

    try {
      // First, perform health check
      const healthCheck = this.performHealthCheck(csvContent);
      if (healthCheck.issues.length > 0) {
        result.warnings.push(...healthCheck.issues);
      }

      // Parse CSV
      const parseResult = CSVParser.parseCSV(csvContent);
      
      if (!parseResult.success) {
        result.errors.push(...(parseResult.errors || []));
        return result;
      }

      if (!parseResult.data || parseResult.data.length === 0) {
        result.errors.push('No valid contacts found in CSV');
        return result;
      }

      const contacts = parseResult.data;
      result.stats.totalRows = contacts.length;
      result.stats.validContacts = contacts.length;

      // Check for duplicates
      const phoneNumbers = new Set<string>();
      const crmIds = new Set<string>();
      const duplicatePhones = new Set<string>();
      const duplicateCrmIds = new Set<string>();

      contacts.forEach(contact => {
        // Check phone duplicates
        if (phoneNumbers.has(contact.phone_number)) {
          duplicatePhones.add(contact.phone_number);
        } else {
          phoneNumbers.add(contact.phone_number);
        }

        // Check CRM ID duplicates
        if (crmIds.has(contact.crm_id)) {
          duplicateCrmIds.add(contact.crm_id);
        } else {
          crmIds.add(contact.crm_id);
        }

        // Check for empty fields
        Object.values(contact).forEach(value => {
          if (!value || value.trim() === '') {
            result.stats.emptyFields++;
          }
        });
      });

      result.stats.duplicatePhones = duplicatePhones.size;
      result.stats.duplicateCrmIds = duplicateCrmIds.size;

      // Add warnings for duplicates
      if (duplicatePhones.size > 0) {
        result.warnings.push(`Found ${duplicatePhones.size} duplicate phone numbers. Only the first occurrence will be processed.`);
      }

      if (duplicateCrmIds.size > 0) {
        result.warnings.push(`Found ${duplicateCrmIds.size} duplicate CRM IDs. This may cause tracking issues.`);
      }

      // Create preview (first few contacts)
      result.preview = contacts.slice(0, this.SAMPLE_SIZE);

      // Data quality warnings
      if (result.stats.emptyFields > 0) {
        result.warnings.push(`Found ${result.stats.emptyFields} empty fields across all contacts`);
      }

      const averageFieldsPerContact = contacts.length > 0 
        ? Object.keys(contacts[0]).length 
        : 0;

      if (averageFieldsPerContact < 4) {
        result.warnings.push('Contacts have very few fields. Consider adding more data for better personalization.');
      }

      // Check for potential data quality issues
      const suspiciousPatterns = this.detectSuspiciousPatterns(contacts);
      if (suspiciousPatterns.length > 0) {
        result.warnings.push(...suspiciousPatterns);
      }

      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private static detectSuspiciousPatterns(contacts: ParsedContact[]): string[] {
    const warnings: string[] = [];

    // Check for sequential patterns in phone numbers or CRM IDs
    const phones = contacts.map(c => c.phone_number).sort();
    const crmIds = contacts.map(c => c.crm_id).sort();

    // Check for too many similar phone numbers
    const phoneGroups = new Map<string, number>();
    phones.forEach(phone => {
      const prefix = phone.substring(0, Math.min(8, phone.length));
      phoneGroups.set(prefix, (phoneGroups.get(prefix) || 0) + 1);
    });

    const maxSimilarPhones = Math.max(...phoneGroups.values());
    if (maxSimilarPhones > contacts.length * 0.5 && contacts.length > 10) {
      warnings.push('Many phone numbers have similar prefixes - verify this is intentional');
    }

    // Check for sequential CRM IDs (might indicate test data)
    const numericCrmIds = crmIds
      .filter(id => /^\d+$/.test(id))
      .map(id => parseInt(id, 10))
      .sort((a, b) => a - b);

    if (numericCrmIds.length > 3) {
      let sequential = 0;
      for (let i = 1; i < numericCrmIds.length; i++) {
        if (numericCrmIds[i] === numericCrmIds[i - 1] + 1) {
          sequential++;
        }
      }
      
      if (sequential > numericCrmIds.length * 0.7) {
        warnings.push('CRM IDs appear to be sequential - this might indicate test data');
      }
    }

    // Check for placeholder/dummy data
    const commonNames = ['test', 'example', 'sample', 'demo', 'john doe', 'jane smith'];
    const suspiciousValues = contacts.filter(contact => {
      const allValues = Object.values(contact).join(' ').toLowerCase();
      return commonNames.some(name => allValues.includes(name));
    });

    if (suspiciousValues.length > contacts.length * 0.1) {
      warnings.push('Some contacts appear to contain placeholder or test data');
    }

    return warnings;
  }

  static removeDuplicates(contacts: ParsedContact[]): {
    cleaned: ParsedContact[];
    duplicatesRemoved: number;
  } {
    const seen = new Set<string>();
    const cleaned: ParsedContact[] = [];
    let duplicatesRemoved = 0;

    contacts.forEach(contact => {
      const key = `${contact.phone_number}:${contact.crm_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(contact);
      } else {
        duplicatesRemoved++;
      }
    });

    return { cleaned, duplicatesRemoved };
  }

  static estimateProcessingTime(contactCount: number, concurrentCalls: number): {
    estimatedMinutes: number;
    estimatedHours: number;
    recommendation: string;
  } {
    // Rough estimates based on typical call durations
    const averageCallDurationMinutes = 3; // Including ring time, conversation, etc.
    const parallelFactor = Math.min(concurrentCalls, 19);
    
    const totalCallMinutes = contactCount * averageCallDurationMinutes;
    const estimatedMinutes = Math.ceil(totalCallMinutes / parallelFactor);
    const estimatedHours = Math.round((estimatedMinutes / 60) * 10) / 10;

    let recommendation = '';
    if (estimatedHours > 8) {
      recommendation = 'Consider splitting into smaller batches or increasing concurrency';
    } else if (estimatedHours > 4) {
      recommendation = 'This is a substantial batch - monitor progress carefully';
    } else if (estimatedHours < 0.5) {
      recommendation = 'Small batch - should complete quickly';
    } else {
      recommendation = 'Normal batch size - should process smoothly';
    }

    return {
      estimatedMinutes: Math.max(1, estimatedMinutes),
      estimatedHours: Math.max(0.1, estimatedHours),
      recommendation
    };
  }
}

export default CSVValidationUtils;