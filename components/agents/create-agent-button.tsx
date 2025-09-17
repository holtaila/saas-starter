'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateAgentDialog } from './create-agent-dialog';

export function CreateAgentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="rounded-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Agent
      </Button>
      
      <CreateAgentDialog 
        open={open} 
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}