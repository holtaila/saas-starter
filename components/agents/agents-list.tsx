'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Phone, 
  Edit, 
  Trash2,
  Bot,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { DeleteAgentDialog } from './delete-agent-dialog';
import { EditAgentDialog } from './edit-agent-dialog';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
});

interface Agent {
  id: string;
  name: string;
  description?: string;
  voice_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  retell_agent_id: string;
}

export function AgentsList() {
  const { data, error, mutate } = useSWR<{ agents: Agent[] }>('/api/agents', fetcher);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load agents. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            Loading agents...
          </div>
        </CardContent>
      </Card>
    );
  }

  const agents = data.agents || [];

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No agents yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first AI voice agent to start making automated calls.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                    {agent.name}
                  </CardTitle>
                  <Badge 
                    variant={agent.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {agent.status}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditAgent(agent)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteAgent(agent)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {agent.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {agent.description}
                </p>
              )}
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  Voice: {agent.voice_id}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Created {formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteAgentDialog
        agent={deleteAgent}
        open={!!deleteAgent}
        onClose={() => setDeleteAgent(null)}
        onSuccess={() => {
          mutate();
          setDeleteAgent(null);
        }}
      />

      <EditAgentDialog
        agent={editAgent}
        open={!!editAgent}
        onClose={() => setEditAgent(null)}
        onSuccess={() => {
          mutate();
          setEditAgent(null);
        }}
      />
    </>
  );
}