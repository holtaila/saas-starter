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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Loader2, Phone, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Common voice options for agents
const VOICE_OPTIONS = [
  { id: '11labs-Adrian', name: 'Adrian (Male, Professional)' },
  { id: '11labs-Alice', name: 'Alice (Female, Friendly)' },
  { id: '11labs-Bill', name: 'Bill (Male, Authoritative)' },
  { id: '11labs-Charlie', name: 'Charlie (Male, Casual)' },
  { id: '11labs-Emily', name: 'Emily (Female, Warm)' },
  { id: '11labs-Grace', name: 'Grace (Female, Professional)' },
];

// Agent types based on the database schema
const AGENT_TYPES = [
  { id: 'sales', name: 'Sales', description: 'Lead generation and sales conversations' },
  { id: 'support', name: 'Support', description: 'Customer service and support' },
  { id: 'appointment', name: 'Appointment', description: 'Schedule appointments and bookings' },
  { id: 'survey', name: 'Survey', description: 'Collect feedback and conduct surveys' },
  { id: 'custom', name: 'Custom', description: 'Custom agent configuration' },
];

// Placeholder LLM options - these would come from your LLM management
const LLM_OPTIONS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
];

export function CreateAgentDialog({ open, onClose, onSuccess }: CreateAgentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom',
    voice_id: '',
    llm_id: 'gpt-3.5-turbo', // Default LLM
    webhook_url: '',
    // Inbound call capabilities
    is_inbound_enabled: false,
    inbound_greeting: '',
    inbound_prompt_template: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create agent');
      }

      const result = await response.json();
      toast.success('Agent created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'custom',
        voice_id: '',
        llm_id: 'gpt-3.5-turbo',
        webhook_url: '',
        is_inbound_enabled: false,
        inbound_greeting: '',
        inbound_prompt_template: '',
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast.error(error.message || 'Failed to create agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new AI voice agent for automated calling campaigns.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Sales Assistant"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of what this agent does..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Agent Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleInputChange('type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span>{type.name}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice_id">Voice</Label>
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
            <Label htmlFor="llm_id">Language Model</Label>
            <Select 
              value={formData.llm_id} 
              onValueChange={(value) => handleInputChange('llm_id', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a language model" />
              </SelectTrigger>
              <SelectContent>
                {LLM_OPTIONS.map((llm) => (
                  <SelectItem key={llm.id} value={llm.id}>
                    {llm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_url">Webhook URL (Optional)</Label>
            <Input
              id="webhook_url"
              value={formData.webhook_url}
              onChange={(e) => handleInputChange('webhook_url', e.target.value)}
              placeholder="https://your-app.com/webhook"
              type="url"
            />
          </div>

          {/* Inbound Call Configuration */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium">Inbound Call Settings</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inbound_enabled"
                checked={formData.is_inbound_enabled}
                onCheckedChange={(checked) => handleCheckboxChange('is_inbound_enabled', checked as boolean)}
              />
              <Label htmlFor="inbound_enabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable this agent to receive inbound calls
              </Label>
            </div>

            {formData.is_inbound_enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="inbound_greeting">Inbound Greeting</Label>
                  <Textarea
                    id="inbound_greeting"
                    value={formData.inbound_greeting}
                    onChange={(e) => handleInputChange('inbound_greeting', e.target.value)}
                    placeholder="Hello! Thank you for calling. How can I help you today?"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    This greeting will be spoken when someone calls this agent directly.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inbound_prompt">Inbound Conversation Prompt</Label>
                  <Textarea
                    id="inbound_prompt"
                    value={formData.inbound_prompt_template}
                    onChange={(e) => handleInputChange('inbound_prompt_template', e.target.value)}
                    placeholder="You are a helpful customer service representative. Listen to the caller's needs and provide assistance..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Instructions for how this agent should behave during inbound calls.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name || !formData.voice_id}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Agent'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}