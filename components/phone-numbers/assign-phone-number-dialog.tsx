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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { mutate } from 'swr';

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
  organization_id?: string;
}

interface AssignPhoneNumberDialogProps {
  phoneNumber: PhoneNumber;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignPhoneNumberDialog({
  phoneNumber,
  open,
  onOpenChange,
  onSuccess,
}: AssignPhoneNumberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const phoneId = phoneNumber.nested_phone?.id || phoneNumber.id;
      
      // For now, we'll assign to the current user's organization
      // In the future, this could be extended to allow selecting different organizations
      const response = await fetch(`/api/phone-numbers/${phoneId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // organization_id will be determined by the current user's profile on the backend
          is_primary: isPrimary,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign phone number');
      }

      toast.success('Phone number assigned successfully');
      mutate('/api/phone-numbers?organization_scope=true');
      onSuccess();
    } catch (error) {
      console.error('Error assigning phone phone_number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayNumber = phoneNumber.nested_phone?.phone_number || phoneNumber.phone_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Phone Number</DialogTitle>
          <DialogDescription>
            Assign the phone number <strong>{displayNumber}</strong> to your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
            />
            <Label
              htmlFor="isPrimary"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Set as primary phone number
            </Label>
          </div>
          
          {isPrimary && (
            <div className="text-sm text-muted-foreground">
              This will replace any existing primary phone number for your organization.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Phone Number'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}