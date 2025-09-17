import { CallsList } from '@/components/calls/calls-list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone } from 'lucide-react';

export default function CallsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbound Calls</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage incoming calls to your organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns">
            <Button>
              <Phone className="h-4 w-4 mr-2" />
              View Campaign Calls
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Looking for outbound call analysis?</h3>
            <p className="text-blue-800 text-sm mt-1">
              Campaign calls with detailed analysis, hang-up reasons, and custom data are available in the{' '}
              <Link href="/dashboard/campaigns" className="underline font-medium">
                Campaigns section
              </Link>
              . This page focuses on inbound calls received by your organization.
            </p>
          </div>
        </div>
      </div>
      
      <CallsList direction="inbound" />
    </div>
  );
}