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
} from 'lucide-react';

const coreFeatures = [
  {
    icon: Brain,
    title: 'AI Agent Brain',
    description: 'LLM-powered decision making with observe-decide-act loop. The AI analyzes pages and decides actions naturally.',
    status: 'stable',
    package: '@testfarm/core',
  },
  {
    icon: Sparkles,
    title: 'Multi-Provider LLM',
    description: 'Support for Anthropic Claude, OpenAI GPT, Ollama local models, and custom OpenAI-compatible endpoints.',
    status: 'stable',
    package: '@testfarm/core',
  },
  {
    icon: Users,
    title: 'Persona System',
    description: 'Define AI agents with unique personalities using natural language YAML. Each agent thinks and acts differently.',
    status: 'stable',
    package: '@testfarm/core',
  },
  {
    icon: Target,
    title: 'Objective Framework',
    description: 'Flexible goal definition with autonomy levels: exploration, goal-directed, restricted, and semi-guided modes.',
    status: 'stable',
    package: '@testfarm/core',
  },
  {
    icon: Globe,
    title: 'Browser Automation',
    description: 'Full Playwright integration with multi-browser support. Click, type, scroll, navigate, and more.',
    status: 'stable',
    package: '@testfarm/core',
  },
  {
    icon: Eye,
    title: 'Vision System',
    description: 'Token-efficient DOM extraction identifies actionable elements, regions, and page structure for the LLM.',
    status: 'stable',
    package: '@testfarm/core',
  },
];

const infrastructureFeatures = [
  {
    icon: Database,
    title: 'SQLite Database',
    description: 'Lightweight local storage with Drizzle ORM for sessions, events, personas, and findings.',
    status: 'stable',
    package: '@testfarm/db',
  },
  {
    icon: Server,
    title: 'REST API',
    description: 'Hono-powered API server with full CRUD operations and Server-Sent Events for real-time updates.',
    status: 'stable',
    package: '@testfarm/api',
  },
  {
    icon: Monitor,
    title: 'Web Dashboard',
    description: 'React + Tailwind dashboard with real-time session monitoring, persona browser, and finding reports.',
    status: 'stable',
    package: '@testfarm/web',
  },
  {
    icon: Terminal,
    title: 'CLI Interface',
    description: 'Command-line tool for headless agent execution, perfect for CI/CD integration.',
    status: 'stable',
    package: '@testfarm/cli',
  },
];

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

const roadmapItems = [
  { feature: 'Persona CRUD UI', priority: 'High', status: 'planned' },
  { feature: 'Objective CRUD UI', priority: 'High', status: 'planned' },
  { feature: 'Session Replay', priority: 'Medium', status: 'planned' },
  { feature: 'Export Reports', priority: 'Medium', status: 'planned' },
  { feature: 'PostgreSQL Support', priority: 'Low', status: 'planned' },
  { feature: 'Docker Setup', priority: 'Low', status: 'planned' },
];

export function Features() {
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
          TestFarm Features
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          AI-powered browser testing where the LLM is the brain. Agents with unique personalities
          interact with websites naturally, discovering real user experience issues.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild>
            <Link to="/sessions">
              <Zap className="mr-2 h-4 w-4" />
              Start Testing
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://github.com/your-org/testfarm" target="_blank" rel="noopener noreferrer">
              <GitBranch className="mr-2 h-4 w-4" />
              View Source
            </a>
          </Button>
        </div>
      </div>

      {/* Core Features */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Core Features</h2>
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

      {/* Infrastructure Features */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Layers className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Infrastructure</h2>
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
          <h2 className="text-2xl font-bold">Architecture</h2>
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
          <h2 className="text-2xl font-bold">Tech Stack</h2>
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

      {/* Roadmap */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Roadmap</h2>
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
                        item.priority === 'High'
                          ? 'default'
                          : item.priority === 'Medium'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {item.priority}
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
            <h3 className="text-2xl font-bold">Ready to Start?</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Create your first AI testing session and discover how real users
              experience your website.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/sessions">
                  Create Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/personas">
                  Browse Personas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
