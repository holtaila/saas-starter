'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneCall } from 'lucide-react';
import { CreateCallDialog } from './create-call-dialog';

export function CreateCallButton() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        <PhoneCall className="mr-2 h-4 w-4" />
        Make Outbound Call
      </Button>
      
      <CreateCallDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => setShowDialog(false)}
      />
    </>
  );
}