'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { Loader2, PhoneCall, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  display_name: string | null;
  status: string;
}

interface CreateCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCallDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCallDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    agent_id: '',
    phone_number_id: '',
    to_phone_number: '',
    purpose: '',
    notes: '',
  });

  // Load agents and phone numbers when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load agents
      const agentsResponse = await fetch('/api/agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.agents?.filter((agent: Agent) => agent.status === 'active') || []);
      }

      // Load assigned phone numbers
      const phoneResponse = await fetch('/api/phone-numbers?organization_scope=true');
      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json();
        setPhoneNumbers(phoneData?.filter((phone: any) => phone.phone_number?.status === 'active') || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load agents and phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: formData.agent_id,
          phone_number_id: formData.phone_number_id,
          to_phone_number: formData.to_phone_number,
          metadata: {
            purpose: formData.purpose || 'outbound_call',
            notes: formData.notes || undefined,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate call');
      }

      const result = await response.json();
      toast.success('Call initiated successfully!');
      
      // Reset form
      setFormData({
        agent_id: '',
        phone_number_id: '',
        to_phone_number: '',
        purpose: '',
        notes: '',
      });
      
      // Refresh calls list
      mutate('/api/calls');
      onSuccess();
    } catch (error) {
      console.error('Error creating call:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate call');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatPhoneNumber = (phone: string) => {
    // Basic US phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Make Outbound Call
          </DialogTitle>
          <DialogDescription>
            Select an agent and phone number to initiate an outbound call.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading agents and phone numbers...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Agent Selection */}
            <div className="space-y-2">
              <Label htmlFor="agent">Select Agent</Label>
              <Select
                value={formData.agent_id}
                onValueChange={(value) => handleInputChange('agent_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an AI agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.length === 0 ? (
                    <SelectItem value="none" disabled>No active agents available</SelectItem>
                  ) : (
                    agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex flex-col">
                          <span>{agent.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{agent.type}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number Selection */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">From Phone Number</Label>
              <Select
                value={formData.phone_number_id}
                onValueChange={(value) => handleInputChange('phone_number_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose outbound phone number" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.length === 0 ? (
                    <SelectItem value="none" disabled>No phone numbers assigned</SelectItem>
                  ) : (
                    phoneNumbers.map((phone) => (
                      <SelectItem key={phone.id} value={phone.id}>
                        <div className="flex flex-col">
                          <span>{formatPhoneNumber(phone.phone_number)}</span>
                          {phone.display_name && (
                            <span className="text-xs text-muted-foreground">{phone.display_name}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Target Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="to_phone_number">To Phone Number</Label>
              <Input
                id="to_phone_number"
                value={formData.to_phone_number}
                onChange={(e) => handleInputChange('to_phone_number', e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            {/* Call Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Call Purpose (Optional)</Label>
              <Select
                value={formData.purpose}
                onValueChange={(value) => handleInputChange('purpose', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select call purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_outreach">Sales Outreach</SelectItem>
                  <SelectItem value="customer_followup">Customer Follow-up</SelectItem>
                  <SelectItem value="appointment_confirmation">Appointment Confirmation</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="support_followup">Support Follow-up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional context for this call..."
                rows={2}
              />
            </div>

            {/* Warning about costs */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Outbound calls will incur charges based on your Retell AI plan. 
                The call will begin immediately after clicking "Initiate Call".
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.agent_id || !formData.phone_number_id || !formData.to_phone_number}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Initiating Call...
                  </>
                ) : (
                  <>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Initiate Call
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}