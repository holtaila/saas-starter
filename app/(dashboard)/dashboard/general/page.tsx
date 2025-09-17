'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function General() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" disabled value="Account settings will be implemented with Supabase" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" disabled value="user@example.com" />
          </div>
          <Button disabled>
            Update Account
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}