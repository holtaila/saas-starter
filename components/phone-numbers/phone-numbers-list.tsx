'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Phone, Star, Settings, Bot, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EditPhoneNumberDialog } from './edit-phone-number-dialog';
import { DeletePhoneNumberDialog } from './delete-phone-number-dialog';
import { AssignPhoneNumberDialog } from './assign-phone-number-dialog';

type PhoneNumberWithAssignment = {
  id: string;
  phone_number: string;
  display_name: string | null;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  retell_phone_number_id?: string | null;
  retell_inbound_agent_id?: string | null;
  retell_outbound_agent_id?: string | null;
  inbound_agent?: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
  outbound_agent?: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
  nested_phone?: {
    id: string;
    phone_number: string;
    display_name: string | null;
    status: string;
    created_at: string;
    retell_phone_number_id?: string | null;
    retell_inbound_agent_id?: string | null;
    retell_outbound_agent_id?: string | null;
    inbound_agent?: {
      id: string;
      name: string;
      type: string;
      status: string;
    } | null;
    outbound_agent?: {
      id: string;
      name: string;
      type: string;
      status: string;
    } | null;
  };
  organization_id?: string;
  is_primary?: boolean;
  assigned_at?: number;
  organization?: {
    id: string;
    name: string;
  };
};

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export function PhoneNumbersList() {
  const [editingPhoneNumber, setEditingPhoneNumber] = useState<PhoneNumberWithAssignment | null>(null);
  const [deletingPhoneNumber, setDeletingPhoneNumber] = useState<PhoneNumberWithAssignment | null>(null);
  const [assigningPhoneNumber, setAssigningPhoneNumber] = useState<PhoneNumberWithAssignment | null>(null);

  const { data: phoneNumbers, error, mutate } = useSWR<PhoneNumberWithAssignment[]>(
    '/api/phone-numbers?organization_scope=true',
    fetcher
  );

  const handleSetPrimary = async (phoneNumberId: string, organizationId: string) => {
    try {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}/primary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId }),
      });

      if (!response.ok) throw new Error('Failed to set primary phone number');

      toast.success('Primary phone number updated');
      mutate();
    } catch (error) {
      console.error('Error setting primary phone phone_number:', error);
      toast.error('Failed to set primary phone number');
    }
  };

  const handleUnassign = async (phoneNumberId: string, organizationId: string) => {
    try {
      const response = await fetch(
        `/api/phone-numbers/${phoneNumberId}/assign?organization_id=${organizationId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to unassign phone number');

      toast.success('Phone number unassigned');
      mutate();
    } catch (error) {
      console.error('Error unassigning phone phone_number:', error);
      toast.error('Failed to unassign phone number');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Failed to load phone numbers</p>
        </CardContent>
      </Card>
    );
  }

  if (!phoneNumbers) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading phone numbers...</p>
        </CardContent>
      </Card>
    );
  }

  if (phoneNumbers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Phone className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No phone numbers yet</h3>
            <p className="text-muted-foreground mt-2">
              Add your first phone number to start using AI agents for calls.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {phoneNumbers.map((assignment) => {
          const phoneNumber = assignment.nested_phone || assignment;
          return (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {phoneNumber.phone_number}
                        {assignment.is_primary && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {phoneNumber.display_name || 'No display name'} • {phoneNumber.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={phoneNumber.status === 'active' ? 'default' : 'secondary'}>
                      {phoneNumber.status}
                    </Badge>
                    {assignment.is_primary && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Primary
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingPhoneNumber(assignment)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Number
                        </DropdownMenuItem>
                        {!assignment.is_primary && assignment.organization_id && (
                          <DropdownMenuItem
                            onClick={() => handleSetPrimary(phoneNumber.id, assignment.organization_id!)}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Set as Primary
                          </DropdownMenuItem>
                        )}
                        {assignment.organization_id && (
                          <DropdownMenuItem
                            onClick={() => handleUnassign(phoneNumber.id, assignment.organization_id!)}
                            className="text-destructive"
                          >
                            Unassign
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeletingPhoneNumber(assignment)}
                          className="text-destructive"
                        >
                          Delete Number
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {phoneNumber.retell_phone_number_id ? ['retell'] : [].map((capability) => (
                    <Badge key={capability} variant="outline" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
                
                {/* Agent Assignments */}
                {(phoneNumber.inbound_agent || phoneNumber.outbound_agent) && (
                  <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Bot className="h-4 w-4" />
                      Agent Assignments
                    </div>
                    <div className="space-y-1">
                      {phoneNumber.inbound_agent && (
                        <div className="flex items-center gap-2 text-sm">
                          <PhoneIncoming className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">Inbound:</span>
                          <span className="font-medium">{phoneNumber.inbound_agent.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {phoneNumber.inbound_agent.type}
                          </Badge>
                        </div>
                      )}
                      {phoneNumber.outbound_agent && (
                        <div className="flex items-center gap-2 text-sm">
                          <PhoneOutgoing className="h-3 w-3 text-blue-600" />
                          <span className="text-muted-foreground">Outbound:</span>
                          <span className="font-medium">{phoneNumber.outbound_agent.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {phoneNumber.outbound_agent.type}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  {assignment.assigned_at && (
                    <p>
                      Assigned {formatDistanceToNow(new Date(assignment.assigned_at))} ago
                      {assignment.organization?.name && ` to ${assignment.organization.name}`}
                    </p>
                  )}
                  <p>Created {formatDistanceToNow(new Date(phoneNumber.created_at))} ago</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editingPhoneNumber && (
        <EditPhoneNumberDialog
          phoneNumber={editingPhoneNumber}
          open={!!editingPhoneNumber}
          onOpenChange={(open) => !open && setEditingPhoneNumber(null)}
          onSuccess={() => {
            mutate();
            setEditingPhoneNumber(null);
          }}
        />
      )}

      {deletingPhoneNumber && (
        <DeletePhoneNumberDialog
          phoneNumber={deletingPhoneNumber}
          open={!!deletingPhoneNumber}
          onOpenChange={(open) => !open && setDeletingPhoneNumber(null)}
          onSuccess={() => {
            mutate();
            setDeletingPhoneNumber(null);
          }}
        />
      )}

      {assigningPhoneNumber && (
        <AssignPhoneNumberDialog
          phoneNumber={assigningPhoneNumber}
          open={!!assigningPhoneNumber}
          onOpenChange={(open) => !open && setAssigningPhoneNumber(null)}
          onSuccess={() => {
            mutate();
            setAssigningPhoneNumber(null);
          }}
        />
      )}
    </>
  );
}