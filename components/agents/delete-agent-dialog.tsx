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
import { useState } from 'react';
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

interface DeleteAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAgentDialog({ agent, open, onClose, onSuccess }: DeleteAgentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!agent) {
    return null;
  }

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete agent');
      }

      toast.success('Agent deleted successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast.error(error.message || 'Failed to delete agent');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Agent</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{agent.name}"? This action cannot be undone.
            The agent will be removed from both Retell AI and your database.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Deleting...
              </>
            ) : (
              'Delete Agent'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}