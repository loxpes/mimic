import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionsApi, personasApi, objectivesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Rocket, Users, Target, Activity, ArrowRight } from 'lucide-react';

const statColors = [
  'border-lcars-orange/50 text-lcars-orange',
  'border-lcars-cyan/50 text-lcars-cyan',
  'border-lcars-lavender/50 text-lcars-lavender',
  'border-lcars-blue/50 text-lcars-blue',
];

export function Dashboard() {
  const { t } = useTranslation();
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
      key: 'totalSessions',
      value: sessions.length,
      icon: Rocket,
      href: '/sessions',
    },
    {
      key: 'activeSessions',
      value: activeSessions.length,
      icon: Activity,
    },
    {
      key: 'personas',
      value: personas.length,
      icon: Users,
      href: '/personas',
    },
    {
      key: 'objectives',
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
          <h1 className="text-3xl font-lcars tracking-wider uppercase text-lcars-orange">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.welcome')}
          </p>
        </div>
        <Button asChild>
          <Link to="/sessions">
            <Rocket className="mr-2 h-4 w-4" />
            {t('sessions.newSession')}
          </Link>
        </Button>
      </div>

      {/* LCARS header bar */}
      <div className="lcars-header-bar" />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.key} className={`border-l-4 ${statColors[i]}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t(`dashboard.${stat.key}`)}</CardTitle>
              <stat.icon className={`h-4 w-4 ${statColors[i].split(' ')[1]} ${activeSessions.length > 0 && stat.key === 'activeSessions' ? 'lcars-blink' : ''}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-lcars">{stat.value}</div>
              {stat.href && (
                <Link
                  to={stat.href}
                  className="text-xs text-muted-foreground hover:text-lcars-orange transition-colors"
                >
                  {t('common.view')} →
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
            <CardTitle>{t('dashboard.recentSessions')}</CardTitle>
            <CardDescription>{t('sessions.subtitle')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/sessions">
              {t('common.view')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('sessions.noSessions')}</p>
              <p className="text-sm">{t('sessions.noSessionsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 rounded-lcars-sm border border-lcars-bar hover:border-lcars-orange/30 hover:bg-lcars-orange/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-lcars-orange/10 flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-lcars-orange" />
                    </div>
                    <div>
                      <p className="font-medium text-lcars-cream">{session.targetUrl}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.state.actionCount} {t('common.actions').toLowerCase()} • {formatDate(session.createdAt)}
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
            <CardTitle className="text-lg">{t('nav.personas')}</CardTitle>
            <CardDescription>{t('dashboard.personasDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personas.slice(0, 3).map((persona) => (
                <div key={persona.id} className="flex items-center gap-3 p-2 rounded-lcars-sm hover:bg-lcars-lavender/10">
                  <div className="h-8 w-8 rounded-full bg-lcars-lavender/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-lcars-lavender" />
                  </div>
                  <span className="font-medium text-lcars-cream">{persona.name}</span>
                </div>
              ))}
              {personas.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('personas.noPersonas')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('nav.objectives')}</CardTitle>
            <CardDescription>{t('dashboard.objectivesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {objectives.slice(0, 3).map((objective) => (
                <div key={objective.id} className="flex items-center gap-3 p-2 rounded-lcars-sm hover:bg-lcars-blue/10">
                  <div className="h-8 w-8 rounded-full bg-lcars-blue/20 flex items-center justify-center">
                    <Target className="h-4 w-4 text-lcars-blue" />
                  </div>
                  <span className="font-medium text-lcars-cream">{objective.name}</span>
                </div>
              ))}
              {objectives.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('objectives.noObjectives')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'warning',
  };

  return (
    <Badge
      variant={variants[status] || 'secondary'}
      className={status === 'running' ? 'lcars-blink' : ''}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
