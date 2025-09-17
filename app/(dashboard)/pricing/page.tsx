import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PricingPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Pricing
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Pricing plans will be implemented with Stripe integration.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
