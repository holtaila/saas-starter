'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface OrganizationSetupFormProps {
  user: User;
}

export function OrganizationSetupForm({ user }: OrganizationSetupFormProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create the organization
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          description: description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create the user's profile with admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          organization_id: organization.id,
          role: 'admin',
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });

      if (profileError) throw profileError;

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      console.error('Setup error:', error);
      setError(error.message || 'An error occurred during setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="organization-name">Organization Name</Label>
        <Input
          id="organization-name"
          type="text"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          required
          maxLength={100}
          className="mt-1"
          placeholder="Enter your organization name"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="mt-1"
          placeholder="Brief description of your organization"
          rows={3}
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !organizationName.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Creating Organization...
          </>
        ) : (
          'Create Organization'
        )}
      </Button>
    </form>
  );
}