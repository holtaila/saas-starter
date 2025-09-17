import { ParsedContact } from './csv-parser';

interface RetellVariable {
  [key: string]: string;
}

interface VariableWithSample {
  name: string;
  sample_value: string;
  description?: string;
}

export class RetellVariableExtractor {
  private static readonly SYSTEM_VARIABLES = [
    'phone',
    'name', 
    'agent_id',
    'organization_id',
    'current_date',
    'current_day'
  ];

  static extractVariablesFromContacts(
    contacts: ParsedContact[],
    agentId: string,
    organizationId: string
  ): {
    variables: VariableWithSample[];
    sampleContact: RetellVariable;
  } {
    // Get all unique column names from contacts
    const allColumns = new Set<string>();
    contacts.forEach(contact => {
      Object.keys(contact).forEach(key => allColumns.add(key));
    });

    // Extract dynamic variables (exclude system variables)
    const dynamicVariables = Array.from(allColumns).filter(
      column => !this.SYSTEM_VARIABLES.includes(column)
    );

    // Create variables with sample values
    const variables: VariableWithSample[] = [];
    
    // Add dynamic variables
    dynamicVariables.forEach(varName => {
      const sampleValue = this.generateSampleValue(varName, contacts);
      variables.push({
        name: varName,
        sample_value: sampleValue,
        description: this.getVariableDescription(varName)
      });
    });

    // Add system variables (these are always included)
    variables.push(
      {
        name: 'phone',
        sample_value: '+14155551234',
        description: 'Contact phone number in E.164 format'
      },
      {
        name: 'name', 
        sample_value: 'John Doe',
        description: 'Contact name or identifier'
      },
      {
        name: 'agent_id',
        sample_value: agentId,
        description: 'Retell AI agent identifier'
      },
      {
        name: 'organization_id',
        sample_value: organizationId,
        description: 'Organization identifier'
      },
      {
        name: 'current_date',
        sample_value: new Date().toISOString().split('T')[0],
        description: 'Current date in YYYY-MM-DD format'
      },
      {
        name: 'current_day',
        sample_value: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        description: 'Current day of the week'
      }
    );

    // Create sample contact with all variables
    const sampleContact = this.createSampleContact(
      contacts[0] || {},
      agentId,
      organizationId
    );

    return {
      variables,
      sampleContact
    };
  }

  static createRetellVariables(
    contact: ParsedContact,
    agentId: string,
    organizationId: string
  ): RetellVariable {
    const now = new Date();
    
    // Start with contact data (all values converted to strings)
    const variables: RetellVariable = {};
    Object.entries(contact).forEach(([key, value]) => {
      variables[key] = String(value || '');
    });

    // Override/add system variables (these always take precedence)
    variables.phone = contact.phone;
    variables.name = contact.name;
    variables.agent_id = agentId;
    variables.organization_id = organizationId;
    variables.current_date = now.toISOString().split('T')[0];
    variables.current_day = now.toLocaleDateString('en-US', { weekday: 'long' });

    return variables;
  }

  private static createSampleContact(
    contactTemplate: ParsedContact,
    agentId: string,
    organizationId: string
  ): RetellVariable {
    const sampleContact: RetellVariable = {};
    
    // Add dynamic variables from template
    Object.keys(contactTemplate).forEach(key => {
      if (!this.SYSTEM_VARIABLES.includes(key)) {
        sampleContact[key] = this.generateSampleValue(key, [contactTemplate]);
      }
    });

    // Add system variables
    const now = new Date();
    sampleContact.phone = '+14155551234';
    sampleContact.name = 'John Doe';
    sampleContact.agent_id = agentId;
    sampleContact.organization_id = organizationId;
    sampleContact.current_date = now.toISOString().split('T')[0];
    sampleContact.current_day = now.toLocaleDateString('en-US', { weekday: 'long' });

    return sampleContact;
  }

  private static generateSampleValue(variableName: string, contacts: ParsedContact[]): string {
    const lowerName = variableName.toLowerCase();
    
    // Get actual value from first contact if available
    const actualValue = contacts[0]?.[variableName];
    if (actualValue && actualValue.trim() !== '') {
      return actualValue;
    }

    // Generate sample based on variable name patterns
    if (lowerName.includes('phone') || lowerName.includes('number')) {
      return '+14155551234';
    }
    
    if (lowerName.includes('email')) {
      return 'john.doe@example.com';
    }
    
    if (lowerName.includes('name') || lowerName.includes('contact')) {
      return 'John Doe';
    }
    
    if (lowerName.includes('company') || lowerName.includes('business')) {
      return 'Acme Corporation';
    }
    
    if (lowerName.includes('address')) {
      return '123 Main Street, San Francisco, CA 94102';
    }
    
    if (lowerName.includes('city')) {
      return 'San Francisco';
    }
    
    if (lowerName.includes('state')) {
      return 'California';
    }
    
    if (lowerName.includes('zip') || lowerName.includes('postal')) {
      return '94102';
    }
    
    if (lowerName.includes('country')) {
      return 'United States';
    }
    
    if (lowerName.includes('date') || lowerName.includes('time')) {
      return new Date().toISOString().split('T')[0];
    }
    
    if (lowerName.includes('age')) {
      return '35';
    }
    
    if (lowerName.includes('price') || lowerName.includes('cost') || lowerName.includes('amount')) {
      return '99.99';
    }
    
    if (lowerName.includes('bool') || lowerName.includes('flag') || lowerName.includes('active')) {
      return 'true';
    }
    
    if (lowerName.includes('url') || lowerName.includes('website')) {
      return 'https://example.com';
    }
    
    if (lowerName.includes('id') || lowerName.includes('identifier')) {
      return 'ID_12345';
    }
    
    // Default fallback
    return `Sample ${variableName}`;
  }

  private static getVariableDescription(variableName: string): string {
    const lowerName = variableName.toLowerCase();
    
    if (lowerName.includes('name')) {
      return 'Contact name or identifier';
    }
    if (lowerName.includes('company')) {
      return 'Company or organization name';
    }
    if (lowerName.includes('email')) {
      return 'Email address';
    }
    if (lowerName.includes('phone')) {
      return 'Phone number';
    }
    if (lowerName.includes('address')) {
      return 'Physical address';
    }
    if (lowerName.includes('date')) {
      return 'Date value';
    }
    if (lowerName.includes('amount') || lowerName.includes('price')) {
      return 'Monetary amount';
    }
    
    return `Custom field: ${variableName}`;
  }

  static getSystemVariables(): string[] {
    return [...this.SYSTEM_VARIABLES];
  }

  static isDynamicVariable(variableName: string): boolean {
    return !this.SYSTEM_VARIABLES.includes(variableName);
  }
}