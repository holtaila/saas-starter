'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface DynamicFieldsProps {
  retellStatus?: {
    metadata?: Record<string, any>;
    retell_llm_dynamic_variables?: Record<string, any>;
    collected_dynamic_variables?: Record<string, any>;
    call_analysis?: {
      custom_analysis_data?: Record<string, any>;
    };
  } | null;
}

interface FieldValue {
  value: any;
  source: 'metadata' | 'dynamic_variables' | 'collected_variables' | 'analysis_data';
}

export function DynamicFields({ retellStatus }: DynamicFieldsProps) {
  const [showEmpty, setShowEmpty] = useState(false);

  if (!retellStatus) {
    return null;
  }

  const getAllFields = (): Record<string, FieldValue> => {
    const fields: Record<string, FieldValue> = {};

    // Add metadata fields
    if (retellStatus.metadata) {
      Object.entries(retellStatus.metadata).forEach(([key, value]) => {
        fields[key] = { value, source: 'metadata' };
      });
    }

    // Add dynamic variables
    if (retellStatus.retell_llm_dynamic_variables) {
      Object.entries(retellStatus.retell_llm_dynamic_variables).forEach(([key, value]) => {
        fields[key] = { value, source: 'dynamic_variables' };
      });
    }

    // Add collected variables
    if (retellStatus.collected_dynamic_variables) {
      Object.entries(retellStatus.collected_dynamic_variables).forEach(([key, value]) => {
        fields[key] = { value, source: 'collected_variables' };
      });
    }

    // Add custom analysis data
    if (retellStatus.call_analysis?.custom_analysis_data) {
      Object.entries(retellStatus.call_analysis.custom_analysis_data).forEach(([key, value]) => {
        fields[key] = { value, source: 'analysis_data' };
      });
    }

    return fields;
  };

  const allFields = getAllFields();
  const fieldEntries = Object.entries(allFields);

  // Filter out empty fields if showEmpty is false
  const filteredFields = fieldEntries.filter(([_, fieldData]) => {
    if (showEmpty) return true;
    
    const { value } = fieldData;
    // Consider empty if null, undefined, empty string, or empty object/array
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    
    return true;
  });

  const getSourceColor = (source: FieldValue['source']) => {
    switch (source) {
      case 'metadata':
        return 'bg-blue-100 text-blue-800';
      case 'dynamic_variables':
        return 'bg-green-100 text-green-800';
      case 'collected_variables':
        return 'bg-purple-100 text-purple-800';
      case 'analysis_data':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: FieldValue['source']) => {
    switch (source) {
      case 'metadata':
        return 'Metadata';
      case 'dynamic_variables':
        return 'Dynamic Var';
      case 'collected_variables':
        return 'Collected';
      case 'analysis_data':
        return 'Analysis';
      default:
        return 'Unknown';
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === null || value === undefined) return 'N/A';
    
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const formatFieldName = (fieldName: string): string => {
    // Convert snake_case and camelCase to readable format
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim();
  };

  if (filteredFields.length === 0 && !showEmpty) {
    return (
      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Dynamic Fields</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmpty(true)}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Show Empty
          </Button>
        </div>
        <p className="text-sm text-gray-500">No dynamic fields with data found for this call.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Dynamic Fields</h3>
        {fieldEntries.length > filteredFields.length && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmpty(!showEmpty)}
            className="text-xs"
          >
            {showEmpty ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Empty
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Empty ({fieldEntries.length - filteredFields.length})
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {filteredFields.map(([fieldName, fieldData]) => (
          <div key={fieldName} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {formatFieldName(fieldName)}
              </span>
              <Badge className={`text-xs ${getSourceColor(fieldData.source)}`}>
                {getSourceLabel(fieldData.source)}
              </Badge>
            </div>
            <div className="text-sm text-gray-700 font-mono">
              {formatValue(fieldData.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}