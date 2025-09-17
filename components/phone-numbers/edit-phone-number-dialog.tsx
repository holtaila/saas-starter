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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { mutate } from 'swr';

interface PhoneNumber {
  id: string;
  phone_number: string;
  display_name: string | null;
  status: 'active' | 'inactive' | 'pending';
  retell_phone_number_id?: string | null;
  nested_phone?: {
    id: string;
    phone_number: string;
    display_name: string | null;
    status: string;
    retell_phone_number_id?: string | null;
  };
}

interface EditPhoneNumberDialogProps {
  phoneNumber: PhoneNumber;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPhoneNumberDialog({
  phoneNumber,
  open,
  onOpenChange,
  onSuccess,
}: EditPhoneNumberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    phone_number: string;
    display_name: string;
    status: 'active' | 'inactive' | 'pending';
  }>({
    phone_number: '',
    display_name: '',
    status: 'pending',
  });

  // Initialize form data when phoneNumber changes
  useEffect(() => {
    const phone = phoneNumber.nested_phone || phoneNumber;
    setFormData({
      phone_number: phone.phone_number,
      display_name: phone.display_name || '',
      status: phone.status as 'active' | 'inactive' | 'pending',
    });
  }, [phoneNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const phoneId = phoneNumber.nested_phone?.id || phoneNumber.id;
      const response = await fetch(`/api/phone-numbers/${phoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update phone number');
      }

      toast.success('Phone number updated successfully');
      mutate('/api/phone-numbers?organization_scope=true');
      onSuccess();
    } catch (error) {
      console.error('Error updating phone phone_number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Phone Number</DialogTitle>
          <DialogDescription>
            Update the phone number details and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="number">Phone Number</Label>
            <Input
              id="number"
              placeholder="+1234567890"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={formData.display_name}
              onValueChange={(value) => setFormData({ ...formData, display_name: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="retell">Retell</SelectItem>
                <SelectItem value="vapi">Vapi</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive' | 'pending') => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              {isSubmitting ? 'Updating...' : 'Update Phone Number'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}