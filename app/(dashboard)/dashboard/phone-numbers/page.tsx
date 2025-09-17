import { PhoneNumbersList } from '@/components/phone-numbers/phone-numbers-list';
import { CreatePhoneNumberButton } from '@/components/phone-numbers/create-phone-number-button';

export default function PhoneNumbersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's phone numbers for AI agents and campaigns.
          </p>
        </div>
        <CreatePhoneNumberButton />
      </div>
      
      <PhoneNumbersList />
    </div>
  );
}