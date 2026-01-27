import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionsApi, personasApi, objectivesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PlayCircle, Users, Target, Activity, Plus, ArrowRight } from 'lucide-react';

export function Dashboard() {
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: personasApi.list,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['objectives'],
    queryFn: objectivesApi.list,
  });

  const activeSessions = sessions.filter((s) => s.state.status === 'running');
  const recentSessions = sessions.slice(0, 5);

  const stats = [
    {
      name: 'Total Sessions',
      value: sessions.length,
      icon: PlayCircle,
      href: '/sessions',
    },
    {
      name: 'Active Sessions',
      value: activeSessions.length,
      icon: Activity,
      color: activeSessions.length > 0 ? 'text-green-500' : undefined,
    },
    {
      name: 'Personas',
      value: personas.length,
      icon: Users,
      href: '/personas',
    },
    {
      name: 'Objectives',
      value: objectives.length,
      icon: Target,
      href: '/objectives',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to TestFarm - AI-powered browser testing agent farm
          </p>
        </div>
        <Button asChild>
          <Link to="/sessions">
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color || ''}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.href && (
                <Link
                  to={stat.href}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View all →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Your latest testing sessions</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/sessions">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sessions yet</p>
              <p className="text-sm">Create your first testing session to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <PlayCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{session.targetUrl}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.state.actionCount} actions • {formatDate(session.createdAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={session.state.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personas</CardTitle>
            <CardDescription>AI agents with unique personalities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personas.slice(0, 3).map((persona) => (
                <div key={persona.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{persona.name}</span>
                </div>
              ))}
              {personas.length === 0 && (
                <p className="text-sm text-muted-foreground">No personas defined yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Objectives</CardTitle>
            <CardDescription>Testing goals and scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {objectives.slice(0, 3).map((objective) => (
                <div key={objective.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{objective.name}</span>
                </div>
              ))}
              {objectives.length === 0 && (
                <p className="text-sm text-muted-foreground">No objectives defined yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'warning',
  };

  return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
}
