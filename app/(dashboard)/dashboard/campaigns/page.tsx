'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, Play, Pause, Trash2, Users, Phone, Calendar, Target, Eye } from 'lucide-react';
import useSWR from 'swr';
import Link from 'next/link';
import { campaignTriggers } from '@/lib/config/edge-functions';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
});

interface Campaign {
  id: string;
  name: string;
  agent_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
  total_numbers: number;
  processed_numbers: number;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  can_retry: boolean;
  retry_count: number;
  trigger_job_id: string | null;
  csv_file_url: string | null;
  original_csv_url: string | null;
  csv_content: any;
  csv_validation_errors: any;
  last_retry_at: string | null;
  agent_name?: string;
}

interface Agent {
  id: string;
  name: string;
  type: 'sales' | 'support' | 'appointment' | 'survey' | 'custom';
}


export default function CampaignsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // Form state for new campaign
  const [campaignName, setCampaignName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  // Fetch data
  const { data: campaigns, mutate: mutateCampaigns } = useSWR<Campaign[]>('/api/campaigns', fetcher);
  const { data: agents } = useSWR<Agent[]>('/api/agents', fetcher);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Flexible column mapping - same as backend
        const COLUMN_MAPPINGS: Record<string, string[]> = {
          'phone': ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'tel'],
          'name': ['name', 'first_name', 'full_name', 'contact_name', 'customer_name'],
          'email': ['email', 'email_address', 'contact_email'],
          'company': ['company', 'organization', 'business', 'employer'],
          'notes': ['notes', 'comments', 'description', 'memo']
        };

        // Find which headers match our required fields
        const findMatchingColumn = (field: string): string | null => {
          const aliases = COLUMN_MAPPINGS[field] || [];
          return headers.find(header => aliases.includes(header)) || null;
        };

        const phoneColumn = findMatchingColumn('phone');
        const nameColumn = findMatchingColumn('name');

        if (!phoneColumn || !nameColumn) {
          const missing = [];
          if (!phoneColumn) missing.push('phone (or phone_number, mobile, cell, etc.)');
          if (!nameColumn) missing.push('name (or first_name, full_name, crm_id, etc.)');
          setUploadError(`Missing required columns: ${missing.join(', ')}`);
          return;
        }

        // Parse data and map columns to standardized names
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
            
            // Map headers to values
            const rawRow: any = {};
            headers.forEach((header, index) => {
              rawRow[header] = values[index] || '';
            });

            // Map to standardized fields
            row.phone = rawRow[phoneColumn];
            row.name = rawRow[nameColumn];
            
            // Map optional fields if present
            const emailColumn = findMatchingColumn('email');
            if (emailColumn && rawRow[emailColumn]) row.email = rawRow[emailColumn];
            
            const companyColumn = findMatchingColumn('company');
            if (companyColumn && rawRow[companyColumn]) row.company = rawRow[companyColumn];
            
            const notesColumn = findMatchingColumn('notes');
            if (notesColumn && rawRow[notesColumn]) row.notes = rawRow[notesColumn];

            // Include any additional columns as dynamic variables
            headers.forEach(header => {
              const standardField = Object.keys(COLUMN_MAPPINGS).find(field => 
                COLUMN_MAPPINGS[field].includes(header)
              );
              if (!standardField && rawRow[header]) {
                row[header] = rawRow[header];
              }
            });

            return row;
          });

        setCsvData(data);
      } catch (error) {
        setUploadError('Failed to parse CSV file. Please check the format.');
      }
    };
    
    reader.readAsText(file);
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !selectedAgent || csvData.length === 0) {
      setUploadError('Please fill in all required fields and upload contacts');
      return;
    }

    setIsCreatingCampaign(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignName,
          agent_id: selectedAgent,
          contacts: csvData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create campaign');
      }

      // Reset form
      setCampaignName('');
      setSelectedAgent('');
      setSelectedFile(null);
      setCsvData([]);

      // Refresh campaigns list
      mutateCampaigns();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'delete') => {
    try {
      if (action === 'delete') {
        // Use API route for delete
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete campaign');
        }
      } else {
        // Use Edge Functions for start/pause actions
        if (action === 'start') {
          await campaignTriggers.startCampaign(campaignId);
        } else if (action === 'pause') {
          await campaignTriggers.pauseCampaign(campaignId);
        }
      }

      mutateCampaigns();
    } catch (error) {
      console.error('Campaign action error:', error);
      setUploadError(`Failed to ${action} campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-600';
      case 'paused': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-600';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Call Campaigns</h1>
        <p className="text-gray-600">Manage and create batch call campaigns with CSV contact uploads</p>
      </div>

      {/* Create New Campaign */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Create New Campaign
          </CardTitle>
          <CardDescription>
            Upload a CSV file with contacts and configure your campaign settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Details */}
          <div>
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              placeholder="Enter campaign name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>


          {/* Agent Selection */}
          <div>
            <Label>Select Agent *</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CSV Upload */}
          <div>
            <Label htmlFor="csv-upload">Upload Contacts (CSV) *</Label>
            <div className="mt-2">
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-sm text-gray-500 mt-1">
                Required: phone (phone_number, mobile, cell) & name (first_name, full_name). Optional: email, company, notes
              </p>
            </div>
          </div>

          {/* CSV Preview */}
          {csvData.length > 0 && (
            <div>
              <Label>Contacts Preview ({csvData.length} contacts)</Label>
              <div className="mt-2 bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                <div className="text-sm font-mono">
                  {csvData.slice(0, 5).map((contact, index) => (
                    <div key={index} className="mb-1">
                      {contact.name} - {contact.phone} {contact.email && `- ${contact.email}`}
                    </div>
                  ))}
                  {csvData.length > 5 && (
                    <div className="text-gray-500">... and {csvData.length - 5} more</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <Alert>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleCreateCampaign} 
            disabled={isCreatingCampaign}
            className="w-full md:w-auto"
          >
            {isCreatingCampaign ? 'Creating Campaign...' : 'Create Campaign'}
          </Button>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
          <CardDescription>Manage and monitor your call campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {!campaigns ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No campaigns yet. Create your first campaign above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <Badge className={`${getStatusColor(campaign.status)} text-white`}>
                        {campaign.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {campaign.status === 'pending' || campaign.status === 'paused' || campaign.status === 'failed' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCampaignAction(campaign.id, 'start')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : campaign.status === 'processing' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCampaignAction(campaign.id, 'pause')}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCampaignAction(campaign.id, 'delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{campaign.total_numbers} contacts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{campaign.processed_numbers} calls made</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-600">
                      Agent: {campaign.agent_name || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}