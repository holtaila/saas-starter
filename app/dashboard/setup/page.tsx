import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizationSetupForm } from '@/components/organization-setup-form';

export default async function SetupPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Check if user already has an organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (profile?.organization_id) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Broker Booker
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's set up your organization to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationSetupForm user={user} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}