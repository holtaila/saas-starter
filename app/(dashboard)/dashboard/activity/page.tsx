import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ActivityPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Activity Log
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Activity logging will be implemented with Supabase.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}