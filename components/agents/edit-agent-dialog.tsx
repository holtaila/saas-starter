'use client';

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
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  description?: string;
  voice_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  retell_agent_id: string;
}

interface EditAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Same voice options as in create dialog
const VOICE_OPTIONS = [
  { id: '11labs-Adrian', name: 'Adrian (Male, Professional)' },
  { id: '11labs-Alice', name: 'Alice (Female, Friendly)' },
  { id: '11labs-Bill', name: 'Bill (Male, Authoritative)' },
  { id: '11labs-Charlie', name: 'Charlie (Male, Casual)' },
  { id: '11labs-Emily', name: 'Emily (Female, Warm)' },
  { id: '11labs-Grace', name: 'Grace (Female, Professional)' },
];

export function EditAgentDialog({ agent, open, onClose, onSuccess }: EditAgentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice_id: '',
    webhook_url: '',
  });

  // Update form data when agent changes
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        voice_id: agent.voice_id || '',
        webhook_url: '', // This would come from the API response
      });
    }
  }, [agent]);

  if (!agent) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update agent');
      }

      const result = await response.json();
      toast.success('Agent updated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast.error(error.message || 'Failed to update agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update your AI voice agent configuration.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Agent Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Sales Assistant"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of what this agent does..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-voice">Voice</Label>
            <Select 
              value={formData.voice_id} 
              onValueChange={(value) => handleInputChange('voice_id', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-webhook">Webhook URL (Optional)</Label>
            <Input
              id="edit-webhook"
              value={formData.webhook_url}
              onChange={(e) => handleInputChange('webhook_url', e.target.value)}
              placeholder="https://your-app.com/webhook"
              type="url"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name || !formData.voice_id}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Agent'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}