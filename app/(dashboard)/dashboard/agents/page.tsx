import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { AgentsList } from '@/components/agents/agents-list';
import { CreateAgentButton } from '@/components/agents/create-agent-button';

export default function AgentsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
            Voice Agents
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your AI voice agents for automated calling
          </p>
        </div>
        <CreateAgentButton />
      </div>
      
      <div className="space-y-6">
        <AgentsList />
      </div>
    </section>
  );
}