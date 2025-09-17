'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Phone, PhoneCall, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type CallStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed';

type Call = {
  id: string;
  phone_number: string;
  status: CallStatus;
  direction: 'inbound' | 'outbound';
  duration_seconds?: number;
  cost?: number;
  metadata?: any;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  agent?: {
    id: string;
    name: string;
    type: string;
  };
  phone_number_record?: {
    id: string;
    phone_number: string;
    display_name: string | null;
  };
};

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const data = await res.json();
  return data;
}

const statusConfig = {
  scheduled: { label: 'Scheduled', icon: Clock, color: 'bg-yellow-500', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', icon: PhoneCall, color: 'bg-blue-500', variant: 'default' as const },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-green-500', variant: 'default' as const },
  failed: { label: 'Failed', icon: XCircle, color: 'bg-red-500', variant: 'destructive' as const },
};

interface CallsListProps {
  direction?: 'inbound' | 'outbound';
}

export function CallsList({ direction }: CallsListProps = {}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Build API URL with direction filter if provided
  const apiUrl = direction ? `/api/calls?direction=${direction}` : '/api/calls';
  
  const { data, error, mutate } = useSWR<{ calls: Call[] }>(apiUrl, fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const handleCancelCall = async (callId: string) => {
    try {
      const response = await fetch(`/api/calls/${callId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel call');
      }

      toast.success('Call cancelled successfully');
      mutate();
    } catch (error) {
      console.error('Error cancelling call:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel call');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCost = (cost?: number) => {
    if (!cost) return 'N/A';
    return `$${(cost / 100).toFixed(3)}`; // Assuming cost is in cents
  };

  // Filter calls based on status and search query
  const filteredCalls = data?.calls?.filter(call => {
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      call.phone_number.includes(searchQuery) ||
      call.agent?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) || [];

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Failed to load calls</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls List */}
      {!data ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading calls...</p>
          </CardContent>
        </Card>
      ) : filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Phone className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No calls found</h3>
              <p className="text-muted-foreground mt-2">
                {data.calls.length === 0 
                  ? "Make your first outbound call to get started."
                  : "No calls match your current filters."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCalls.map((call) => {
            const status = statusConfig[call.status];
            const StatusIcon = status.icon;
            
            return (
              <Card key={call.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.color.replace('bg-', 'bg-')} text-white`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {call.phone_number}
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {call.agent?.name || 'Unknown Agent'} • {call.direction}
                        </p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(call.status === 'scheduled' || call.status === 'in_progress') && (
                          <DropdownMenuItem
                            onClick={() => handleCancelCall(call.id)}
                            className="text-destructive"
                          >
                            Cancel Call
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">{formatCost(call.cost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Started</p>
                      <p className="font-medium">
                        {call.started_at 
                          ? formatDistanceToNow(new Date(call.started_at)) + ' ago'
                          : 'Not started'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(call.created_at))} ago
                      </p>
                    </div>
                  </div>
                  
                  {call.metadata && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">Purpose:</p>
                      <p className="text-sm">{call.metadata.purpose || 'No purpose specified'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}