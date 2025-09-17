'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Phone, 
  Clock, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  XCircle, 
  PlayCircle, 
  PauseCircle,
  MoreHorizontal,
  Download,
  Filter,
  Search,
  RefreshCcw,
  FileText,
  Calendar,
  Square,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { DynamicFields } from '@/components/calls/dynamic-fields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
});

interface Campaign {
  id: string;
  name: string;
  description?: string;
  agent_id: string;
  phone_number_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
  total_numbers: number;
  processed_numbers: number;
  created_at: string;
  updated_at: string | null;
  agent_name?: string;
  phone_number?: string;
  campaign_contacts: CampaignContact[];
}

interface CampaignContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  status: 'pending' | 'calling' | 'completed' | 'failed' | 'cancelled';
  call_id: string | null;
  attempted_at: string | null;
  completed_at: string | null;
}

interface Call {
  id: string;
  campaign_id: string;
  agent_id: string;
  phone_number: string;
  from_number: string | null;
  to_number: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  direction: 'inbound' | 'outbound';
  call_type: 'phone_call' | 'web_call' | null;
  duration_seconds: number | null;
  cost: number | null;
  recording_url: string | null;
  transcript: string | null;
  metadata: any;
  retell_call_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  disconnect_reason: string | null;
  call_analysis: {
    call_successful?: boolean;
    call_summary?: string;
    in_voicemail?: boolean;
    user_sentiment?: 'Negative' | 'Positive' | 'Neutral' | 'Unknown';
    custom_analysis_data?: any;
  } | null;
  agent?: {
    name: string;
    type: string;
  };
}

interface CallAnalytics {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  totalDuration: number;
  averageDuration: number;
  totalCost: number;
  successRate: number;
  answerRate: number;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Fetch campaign details with contacts
  const { data: campaign, error: campaignError, mutate: mutateCampaign } = useSWR<Campaign>(
    `/api/campaigns/${campaignId}`,
    fetcher
  );

  // Fetch calls for this campaign
  const { data: callsData, error: callsError } = useSWR<{ calls: Call[] }>(
    `/api/calls?campaign_id=${campaignId}&limit=1000`,
    fetcher
  );

  // Fetch individual call details for modal
  const { data: selectedCall } = useSWR<{ call: Call; retell_status: any }>(
    selectedCallId ? `/api/calls/${selectedCallId}` : null,
    fetcher
  );

  if (campaignError || callsError) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Error loading campaign: {campaignError?.message || callsError?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading campaign details...</div>
      </div>
    );
  }

  const calls = callsData?.calls || [];
  
  // Filter calls
  const filteredCalls = calls.filter(call => {
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    const matchesSearch = !searchQuery || 
      call.phone_number.includes(searchQuery) ||
      call.from_number?.includes(searchQuery) ||
      call.to_number?.includes(searchQuery) ||
      (call.agent?.name && call.agent.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate analytics
  const analytics: CallAnalytics = {
    totalCalls: calls.length,
    completedCalls: calls.filter(c => c.status === 'completed').length,
    failedCalls: calls.filter(c => c.status === 'failed').length,
    inProgressCalls: calls.filter(c => c.status === 'in_progress').length,
    totalDuration: calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0),
    averageDuration: calls.filter(c => c.duration_seconds).length > 0 
      ? calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / calls.filter(c => c.duration_seconds).length
      : 0,
    totalCost: calls.reduce((sum, call) => sum + (call.cost || 0), 0),
    successRate: calls.length > 0 ? (calls.filter(c => c.status === 'completed').length / calls.length) * 100 : 0,
    answerRate: calls.length > 0 ? (calls.filter(c => c.duration_seconds && c.duration_seconds > 0).length / calls.length) * 100 : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': case 'in_progress': case 'calling': return 'bg-blue-500';
      case 'completed': return 'bg-green-600';
      case 'paused': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-600';
      case 'pending': case 'scheduled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDisconnectReasonDisplay = (reason: string | null) => {
    if (!reason) return null;
    const reasonMap: Record<string, { label: string; color: string }> = {
      'user_hangup': { label: 'User Hung Up', color: 'bg-blue-100 text-blue-800' },
      'agent_hangup': { label: 'Agent Ended', color: 'bg-green-100 text-green-800' },
      'dial_busy': { label: 'Busy Signal', color: 'bg-yellow-100 text-yellow-800' },
      'dial_no_answer': { label: 'No Answer', color: 'bg-orange-100 text-orange-800' },
      'dial_failed': { label: 'Dial Failed', color: 'bg-red-100 text-red-800' },
      'machine_detected': { label: 'Voicemail', color: 'bg-purple-100 text-purple-800' },
      'max_duration_reached': { label: 'Max Duration', color: 'bg-gray-100 text-gray-800' },
      'inactivity': { label: 'Inactivity', color: 'bg-gray-100 text-gray-800' },
      'call_transfer': { label: 'Transferred', color: 'bg-blue-100 text-blue-800' }
    };
    return reasonMap[reason] || { label: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), color: 'bg-gray-100 text-gray-800' };
  };

  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return 'bg-gray-100 text-gray-800';
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionOutcome = (call: Call) => {
    // First check call_analysis if available
    if (call.call_analysis?.call_successful !== undefined) {
      return {
        outcome: call.call_analysis.call_successful ? 'successful' : 'unsuccessful',
        color: call.call_analysis.call_successful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        label: call.call_analysis.call_successful ? '✓ Successful' : '✗ Unsuccessful'
      };
    }
    
    // Fallback to status-based outcome
    switch (call.status) {
      case 'completed':
        return {
          outcome: 'completed',
          color: 'bg-green-100 text-green-800',
          label: 'Completed'
        };
      case 'failed':
        return {
          outcome: 'failed',
          color: 'bg-red-100 text-red-800', 
          label: 'Failed'
        };
      case 'in_progress':
        return {
          outcome: 'in_progress',
          color: 'bg-blue-100 text-blue-800',
          label: 'In Progress'
        };
      default:
        return {
          outcome: call.status,
          color: 'bg-gray-100 text-gray-800',
          label: call.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
    }
  };

  // Bulk action handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCalls(new Set(filteredCalls.map(call => call.id)));
    } else {
      setSelectedCalls(new Set());
    }
  };

  const handleSelectCall = (callId: string, checked: boolean) => {
    const newSelected = new Set(selectedCalls);
    if (checked) {
      newSelected.add(callId);
    } else {
      newSelected.delete(callId);
    }
    setSelectedCalls(newSelected);
  };

  const handleBulkExport = async () => {
    if (selectedCalls.size === 0) return;
    
    setIsBulkActionLoading(true);
    try {
      const selectedCallsData = calls.filter(call => selectedCalls.has(call.id));
      const csvContent = [
        'Time,Duration,Channel Type,Cost,End Reason,Session Status,User Sentiment,From,To,Session Outcome,Phone Number,Started At,Ended At,Summary,In Voicemail',
        ...selectedCallsData.map(call => {
          const sessionOutcome = getSessionOutcome(call);
          const disconnectReason = getDisconnectReasonDisplay(call.disconnect_reason);
          return `${call.started_at || ''},${formatDuration(call.duration_seconds)},${call.call_type || 'phone_call'},${formatCurrency(call.cost)},${disconnectReason?.label || ''},${call.status},${call.call_analysis?.user_sentiment || ''},${call.from_number || ''},${call.to_number || ''},${sessionOutcome.label},${call.phone_number},${call.started_at || ''},${call.ended_at || ''},\"${call.call_analysis?.call_summary?.replace(/"/g, '""') || ''}\",${call.call_analysis?.in_voicemail || false}`;
        })
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaignId}-calls.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkRetry = async () => {
    if (selectedCalls.size === 0) return;
    
    setIsBulkActionLoading(true);
    try {
      // This would be implemented with an API endpoint for retrying failed calls
      console.log('Retrying calls:', Array.from(selectedCalls));
      // TODO: Implement bulk retry API call
      alert('Bulk retry functionality would be implemented here');
    } catch (error) {
      console.error('Retry error:', error);
    } finally {
      setIsBulkActionLoading(false);
      setSelectedCalls(new Set());
    }
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto transition-all duration-300 ${selectedCallId ? 'pr-96' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <Badge className={`${getStatusColor(campaign.status)} text-white`}>
                {campaign.status.toUpperCase()}
              </Badge>
              <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
              <span>Agent: {campaign.agent_name || 'Unknown'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.total_numbers} contacts in campaign
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedCalls} completed calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(analytics.totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(Math.round(analytics.averageDuration))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Answer rate: {analytics.answerRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="calls" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calls">Call Details</TabsTrigger>
          <TabsTrigger value="contacts">Original Contacts</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by phone number or agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedCalls.size > 0 && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">
                  {selectedCalls.size} call{selectedCalls.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkExport}
                  disabled={isBulkActionLoading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkRetry}
                  disabled={isBulkActionLoading}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry Failed
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCalls(new Set())}
                  disabled={isBulkActionLoading}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Calls Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Calls ({filteredCalls.length})</CardTitle>
                  <CardDescription>
                    Detailed view of all calls made as part of this campaign
                  </CardDescription>
                </div>
                {filteredCalls.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCalls.size === filteredCalls.length && filteredCalls.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-gray-600">Select All</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredCalls.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {calls.length === 0 ? 'No calls made yet' : 'No calls match your filters'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCalls.map((call) => {
                    const disconnectReason = getDisconnectReasonDisplay(call.disconnect_reason);
                    const sentiment = call.call_analysis?.user_sentiment;
                    const isSuccessful = call.call_analysis?.call_successful;
                    const inVoicemail = call.call_analysis?.in_voicemail;
                    const sessionOutcome = getSessionOutcome(call);
                    
                    return (
                      <div
                        key={call.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                        onClick={(e) => {
                          // Don't trigger if clicking on checkbox
                          if ((e.target as HTMLElement).closest('[data-checkbox]')) {
                            return;
                          }
                          setSelectedCallId(call.id);
                        }}
                      >
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div data-checkbox>
                              <Checkbox
                                checked={selectedCalls.has(call.id)}
                                onCheckedChange={(checked) => handleSelectCall(call.id, !!checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="font-medium group-hover:text-blue-600 transition-colors">
                              {call.direction === 'inbound' ? call.from_number : call.to_number || call.phone_number}
                            </div>
                            <Badge className={`${getStatusColor(call.status)} text-white`}>
                              {call.status}
                            </Badge>
                            <Badge className={sessionOutcome.color}>
                              {sessionOutcome.label}
                            </Badge>
                            {disconnectReason && (
                              <Badge className={disconnectReason.color}>
                                {disconnectReason.label}
                              </Badge>
                            )}
                            {inVoicemail && (
                              <Badge className="bg-purple-100 text-purple-800">
                                Voicemail
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>{call.started_at ? new Date(call.started_at).toLocaleString() : 'Not started'}</span>
                            <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Click to view details</span>
                          </div>
                        </div>
                        
                        {/* Main Details Row */}
                        <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                          <span>Duration: {formatDuration(call.duration_seconds)}</span>
                          <span>Cost: {formatCurrency(call.cost)}</span>
                          {call.recording_url && (
                            <span className="text-blue-600">🎵 Recording</span>
                          )}
                          {call.transcript && (
                            <span className="text-green-600">📝 Transcript</span>
                          )}
                        </div>
                        
                        {/* Analysis & Sentiment Row */}
                        {(sentiment || call.call_analysis?.call_summary) && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-4 mb-2">
                              {sentiment && (
                                <Badge className={getSentimentColor(sentiment)}>
                                  😊 {sentiment}
                                </Badge>
                              )}
                              {call.call_analysis?.custom_analysis_data && (
                                <span className="text-xs text-blue-600">Custom Data Available</span>
                              )}
                            </div>
                            {call.call_analysis?.call_summary && (
                              <p className="text-sm text-gray-700 italic">
                                "{call.call_analysis.call_summary.substring(0, 150)}{call.call_analysis.call_summary.length > 150 ? '...' : ''}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Original Campaign Contacts</CardTitle>
              <CardDescription>
                Contacts that were uploaded for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!campaign.campaign_contacts || campaign.campaign_contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No contacts found</div>
              ) : (
                <div className="space-y-2">
                  {campaign.campaign_contacts.map((contact) => (
                    <div key={contact.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-gray-600">{contact.phone}</div>
                          {contact.email && (
                            <div className="text-sm text-gray-600">{contact.email}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={`${getStatusColor(contact.status)} text-white mb-2`}>
                            {contact.status}
                          </Badge>
                          {contact.attempted_at && (
                            <div className="text-sm text-gray-500">
                              Attempted: {new Date(contact.attempted_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      {contact.company && (
                        <div className="text-sm text-gray-600 mt-2">Company: {contact.company}</div>
                      )}
                      {contact.notes && (
                        <div className="text-sm text-gray-600 mt-2">Notes: {contact.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Completed
                    </span>
                    <span className="font-medium">{analytics.completedCalls}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Failed
                    </span>
                    <span className="font-medium">{analytics.failedCalls}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-blue-600" />
                      In Progress
                    </span>
                    <span className="font-medium">{analytics.inProgressCalls}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">{analytics.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Answer Rate:</span>
                    <span className="font-medium">{analytics.answerRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Call Duration:</span>
                    <span className="font-medium">{formatDuration(Math.round(analytics.averageDuration))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost per Call:</span>
                    <span className="font-medium">
                      {formatCurrency(analytics.totalCalls > 0 ? analytics.totalCost / analytics.totalCalls : 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Call Detail Sidebar */}
      {selectedCallId && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentIndex = filteredCalls.findIndex(c => c.id === selectedCallId);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredCalls.length - 1;
                  setSelectedCallId(filteredCalls[prevIndex]?.id);
                }}
                disabled={filteredCalls.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <div className="text-sm font-medium">Call Details</div>
                <div className="text-xs text-gray-500">
                  {filteredCalls.findIndex(c => c.id === selectedCallId) + 1} of {filteredCalls.length}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentIndex = filteredCalls.findIndex(c => c.id === selectedCallId);
                  const nextIndex = currentIndex < filteredCalls.length - 1 ? currentIndex + 1 : 0;
                  setSelectedCallId(filteredCalls[nextIndex]?.id);
                }}
                disabled={filteredCalls.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCallId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedCall && (
            <div className="flex-1 overflow-y-auto">
              {/* Call Status & Success Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={`${getStatusColor(selectedCall.call.status)} text-white px-3 py-1`}>
                    {selectedCall.call.status.toUpperCase()}
                  </Badge>
                  {selectedCall.call.call_analysis?.call_successful !== undefined && (
                    <Badge className={selectedCall.call.call_analysis.call_successful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {selectedCall.call.call_analysis.call_successful ? '✓ Successful' : '✗ Unsuccessful'}
                    </Badge>
                  )}
                </div>
                
                {/* Duration - Only Metric We Keep */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Duration</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{formatDuration(selectedCall.call.duration_seconds)}</p>
                </div>
              </div>

              {/* Call Information */}
              <div className="p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">Call Information</h3>
                
                {/* Phone Numbers */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">From:</span>
                    <span className="font-mono font-medium">{selectedCall.call.from_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">To:</span>
                    <span className="font-mono font-medium">{selectedCall.call.to_number || selectedCall.call.phone_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Direction:</span>
                    <span className="capitalize font-medium">{selectedCall.call.direction}</span>
                  </div>
                </div>

                {/* End Reason - Check both Retell live data and database */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-600">End Reason:</span>
                  <div>
                    {(() => {
                      // Check Retell live data first, then database
                      const disconnectReason = selectedCall.retell_status?.disconnection_reason || selectedCall.call.disconnect_reason;
                      
                      if (disconnectReason) {
                        const reasonDisplay = getDisconnectReasonDisplay(disconnectReason);
                        return (
                          <Badge className={reasonDisplay?.color || 'bg-gray-100 text-gray-800'}>
                            {reasonDisplay?.label || disconnectReason}
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending Analysis
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                </div>

              </div>

              {/* Call Analysis */}
              {selectedCall.call.call_analysis && (
                <div className="p-4 border-t space-y-4">
                  <h3 className="font-semibold text-gray-900">Call Analysis</h3>
                  
                  {/* Outcome & Sentiment */}
                  <div className="space-y-3">
                    {selectedCall.call.call_analysis.call_successful !== undefined && (
                      <div>
                        <span className="text-sm text-gray-600">Outcome:</span>
                        <div className="mt-1">
                          <Badge className={selectedCall.call.call_analysis.call_successful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {selectedCall.call.call_analysis.call_successful ? 'Successful' : 'Unsuccessful'}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {selectedCall.call.call_analysis.user_sentiment && (
                      <div>
                        <span className="text-sm text-gray-600">Sentiment:</span>
                        <div className="mt-1">
                          <Badge className={getSentimentColor(selectedCall.call.call_analysis.user_sentiment)}>
                            {selectedCall.call.call_analysis.user_sentiment === 'Positive' && '😊'}
                            {selectedCall.call.call_analysis.user_sentiment === 'Negative' && '😞'}
                            {selectedCall.call.call_analysis.user_sentiment === 'Neutral' && '😐'}
                            {selectedCall.call.call_analysis.user_sentiment === 'Unknown' && '❓'}
                            {' '}{selectedCall.call.call_analysis.user_sentiment}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {selectedCall.call.call_analysis.in_voicemail && (
                      <div>
                        <Badge className="bg-purple-100 text-purple-800">
                          📧 Voicemail Detected
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Call Summary */}
                  {selectedCall.call.call_analysis.call_summary && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Summary:</span>
                      <div className="mt-2 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                        <p className="text-sm leading-relaxed text-gray-700">{selectedCall.call.call_analysis.call_summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Fields from Retell */}
              <DynamicFields retellStatus={selectedCall.retell_status} />

              {/* Transcript & Recording Sections */}
              <div className="border-t">
                <Tabs defaultValue="recording" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mx-4 mt-4 mb-2">
                    <TabsTrigger value="recording" className="text-xs">Recording</TabsTrigger>
                    <TabsTrigger value="transcript" className="text-xs">Transcript</TabsTrigger>
                    <TabsTrigger value="timing" className="text-xs">Timing</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="timing" className="p-4 space-y-3">
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-mono">{new Date(selectedCall.call.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span className="font-mono">{selectedCall.call.started_at ? new Date(selectedCall.call.started_at).toLocaleString() : 'Not started'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ended:</span>
                        <span className="font-mono">{selectedCall.call.ended_at ? new Date(selectedCall.call.ended_at).toLocaleString() : 'Not ended'}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="transcript" className="p-4">
                    {selectedCall.call.transcript ? (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                          <p className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{selectedCall.call.transcript}</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => {
                          if (!selectedCall.call.transcript) return;
                          const element = document.createElement('a');
                          const file = new Blob([selectedCall.call.transcript], {type: 'text/plain'});
                          element.href = URL.createObjectURL(file);
                          element.download = `transcript-${selectedCall.call.id}.txt`;
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}>
                          <Download className="h-3 w-3 mr-1" />
                          Download Transcript
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No transcript available</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="recording" className="p-4">
                    {selectedCall.call.recording_url ? (
                      <div className="space-y-3">
                        <audio controls className="w-full">
                          <source src={selectedCall.call.recording_url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={selectedCall.call.recording_url} download>
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <PlayCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No recording available</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}