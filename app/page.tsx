import { Button } from '@/components/ui/button';
import { CircleIcon } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
          <div className="flex items-center mb-8">
            <CircleIcon className="h-12 w-12 text-orange-500 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Broker Booker</h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl">
            Your AI-powered call management platform. Automate outbound calling, 
            manage leads, and boost your sales team's productivity.
          </p>
          
          <div className="flex gap-4">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}