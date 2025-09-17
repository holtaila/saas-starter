'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { AlertTriangle } from 'lucide-react';

interface PhoneNumber {
  id: string;
  phone_number: string;
  display_name: string | null;
  status: string;
  retell_phone_number_id?: string | null;
  nested_phone?: {
    id: string;
    phone_number: string;
    display_name: string | null;
    status: string;
    retell_phone_number_id?: string | null;
  };
  is_primary?: boolean;
}

interface DeletePhoneNumberDialogProps {
  phoneNumber: PhoneNumber;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeletePhoneNumberDialog({
  phoneNumber,
  open,
  onOpenChange,
  onSuccess,
}: DeletePhoneNumberDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const phoneId = phoneNumber.nested_phone?.id || phoneNumber.id;
      const response = await fetch(`/api/phone-numbers/${phoneId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete phone number');
      }

      toast.success('Phone number deleted successfully');
      mutate('/api/phone-numbers?organization_scope=true');
      onSuccess();
    } catch (error) {
      console.error('Error deleting phone phone_number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete phone number');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayNumber = phoneNumber.nested_phone?.phone_number || phoneNumber.phone_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Phone Number
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the phone number <strong>{displayNumber}</strong>?
            {phoneNumber.is_primary && (
              <span className="block mt-2 text-destructive">
                Warning: This is your primary phone number. Deleting it may affect your AI agents.
              </span>
            )}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Phone Number'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}