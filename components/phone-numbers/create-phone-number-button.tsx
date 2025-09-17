'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreatePhoneNumberDialog } from './create-phone-number-dialog';

export function CreatePhoneNumberButton() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Phone Number
      </Button>
      
      <CreatePhoneNumberDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => setShowDialog(false)}
      />
    </>
  );
}