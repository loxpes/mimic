import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Brain,
  Globe,
  Users,
  Target,
  Zap,
  Eye,
  Database,
  Server,
  Monitor,
  Terminal,
  Layers,
  GitBranch,
  Shield,
  Clock,
  BarChart3,
  Sparkles,
  ArrowRight,
  FolderKanban,
  AlertTriangle,
  FileText,
  Copy,
  Radio,
  Link2,
  CheckCircle2,
} from 'lucide-react';

const techStack = [
  { name: 'TypeScript', category: 'Language' },
  { name: 'Playwright', category: 'Browser' },
  { name: 'Vercel AI SDK', category: 'LLM' },
  { name: 'Drizzle ORM', category: 'Database' },
  { name: 'SQLite', category: 'Storage' },
  { name: 'Hono', category: 'API' },
  { name: 'React', category: 'Frontend' },
  { name: 'Vite', category: 'Build' },
  { name: 'Tailwind CSS', category: 'Styling' },
  { name: 'pnpm', category: 'Monorepo' },
];

export function Features() {
  const { t } = useTranslation();

  const coreFeatures = [
    {
      icon: Brain,
      title: t('features.aiAgentBrain'),
      description: t('features.aiAgentBrainDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: Sparkles,
      title: t('features.multiProviderLlm'),
      description: t('features.multiProviderLlmDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: Users,
      title: t('features.personaSystem'),
      description: t('features.personaSystemDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: Target,
      title: t('features.objectiveFramework'),
      description: t('features.objectiveFrameworkDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: Globe,
      title: t('features.browserAutomation'),
      description: t('features.browserAutomationDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: Eye,
      title: t('features.visionSystem'),
      description: t('features.visionSystemDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: AlertTriangle,
      title: t('features.findingsDetection'),
      description: t('features.findingsDetectionDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: FileText,
      title: t('features.sessionReports'),
      description: t('features.sessionReportsDesc'),
      status: 'stable',
      package: '@testfarm/core',
    },
    {
      icon: Copy,
      title: t('features.batchSessions'),
      description: t('features.batchSessionsDesc'),
      status: 'stable',
      package: '@testfarm/api',
    },
  ];

  const projectFeatures = [
    {
      icon: FolderKanban,
      title: t('features.projectManagement'),
      description: t('features.projectManagementDesc'),
      status: 'stable',
      package: '@testfarm/api',
    },
  ];

  const integrationFeatures = [
    {
      icon: Link2,
      title: t('features.trelloIntegration'),
      description: t('features.trelloIntegrationDesc'),
      status: 'stable',
      package: '@testfarm/api',
    },
    {
      icon: Radio,
      title: t('features.findingSync'),
      description: t('features.findingSyncDesc'),
      status: 'stable',
      package: '@testfarm/api',
    },
  ];

  const infrastructureFeatures = [
    {
      icon: Database,
      title: t('features.sqliteDatabase'),
      description: t('features.sqliteDatabaseDesc'),
      status: 'stable',
      package: '@testfarm/db',
    },
    {
      icon: Server,
      title: t('features.restApi'),
      description: t('features.restApiDesc'),
      status: 'stable',
      package: '@testfarm/api',
    },
    {
      icon: Monitor,
      title: t('features.webDashboard'),
      description: t('features.webDashboardDesc'),
      status: 'stable',
      package: '@testfarm/web',
    },
    {
      icon: Terminal,
      title: t('features.cliInterface'),
      description: t('features.cliInterfaceDesc'),
      status: 'stable',
      package: '@testfarm/cli',
    },
  ];

  const completedItems = [
    { feature: t('features.personaCrudUi'), priorityKey: 'high' },
    { feature: t('features.objectiveCrudUi'), priorityKey: 'high' },
    { feature: t('features.projectManagement'), priorityKey: 'high' },
    { feature: t('features.trelloIntegration'), priorityKey: 'high' },
    { feature: t('features.findingsDeduplication'), priorityKey: 'medium' },
    { feature: t('features.batchSessionCreation'), priorityKey: 'medium' },
  ];

  const roadmapItems = [
    { feature: t('features.sessionReplay'), priorityKey: 'high' },
    { feature: t('features.exportReports'), priorityKey: 'medium' },
    { feature: t('features.jiraIntegration'), priorityKey: 'medium' },
    { feature: t('features.githubIssuesIntegration'), priorityKey: 'medium' },
    { feature: t('features.postgresqlSupport'), priorityKey: 'low' },
    { feature: t('features.dockerSetup'), priorityKey: 'low' },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          {t('features.title')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('features.subtitle')}
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild>
            <Link to="/sessions">
              <Zap className="mr-2 h-4 w-4" />
              {t('features.startTesting')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://github.com/your-org/testfarm" target="_blank" rel="noopener noreferrer">
              <GitBranch className="mr-2 h-4 w-4" />
              {t('features.viewSource')}
            </a>
          </Button>
        </div>
      </div>

      {/* Core Features */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('features.coreFeatures')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feature) => (
            <Card key={feature.title} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="success" className="text-xs">
                    {feature.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {feature.package}
                </code>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('nav.projects')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-1">
          {projectFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant="success" className="text-xs">
                        {feature.status}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {feature.package}
                    </code>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Link2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('features.integrations')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {integrationFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant="success" className="text-xs">
                        {feature.status}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {feature.package}
                    </code>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Infrastructure Features */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Layers className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('features.infrastructure')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {infrastructureFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <code className="text-xs text-muted-foreground">
                      {feature.package}
                    </code>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Architecture Overview */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('features.architecture')}</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────┐
│                    AI AGENT CORE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│   │ OBSERVE │───►│ DECIDE  │───►│  ACT    │                │
│   └────▲────┘    └─────────┘    └────┬────┘                │
│        │         (LLM thinks)        │                      │
│        └─────────────────────────────┘                      │
│                  Continuous loop                            │
└─────────────────────────────────────────────────────────────┘

1. OBSERVE: Extract structured DOM + screenshot if needed
2. DECIDE: LLM receives context (persona + objective) and decides
3. ACT: Playwright executes the action
4. REPEAT until objective completed`}
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* Tech Stack */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('features.techStack')}</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <Badge key={tech.name} variant="outline" className="px-3 py-1">
                  <span className="font-medium">{tech.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {tech.category}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Completed Features */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <h2 className="text-2xl font-bold">{t('features.recentlyCompleted')}</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {completedItems.map((item) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-500/10"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{item.feature}</span>
                  </div>
                  <Badge variant="success" className="text-xs">
                    {t('features.done')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Roadmap */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('features.roadmap')}</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {roadmapItems.map((item) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="font-medium">{item.feature}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.priorityKey === 'high'
                          ? 'default'
                          : item.priorityKey === 'medium'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {t(`features.${item.priorityKey}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-2xl font-bold">{t('features.readyToStart')}</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t('features.readyToStartDesc')}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/sessions">
                  {t('features.createSession')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/personas">
                  {t('features.browsePersonas')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
