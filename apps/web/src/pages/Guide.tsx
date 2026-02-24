import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Eye,
  Brain,
  MousePointerClick,
  Users,
  Target,
  Rocket,
  BarChart3,
  LayoutDashboard,
  Swords,
  Globe,
  Cpu,
  Settings,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const workflowSteps = [
  { titleKey: 'step1Title', descKey: 'step1Desc', icon: Users, href: '/personas', color: 'lcars-lavender' },
  { titleKey: 'step2Title', descKey: 'step2Desc', icon: Target, href: '/objectives', color: 'lcars-blue' },
  { titleKey: 'step3Title', descKey: 'step3Desc', icon: Rocket, href: '/sessions', color: 'lcars-orange' },
  { titleKey: 'step4Title', descKey: 'step4Desc', icon: BarChart3, href: '/sessions', color: 'lcars-cyan' },
];

const appSections = [
  { key: 'Dashboard', descKey: 'sectionDashboard', icon: LayoutDashboard, href: '/', navKey: 'dashboard', color: 'lcars-orange' },
  { key: 'Sessions', descKey: 'sectionSessions', icon: Rocket, href: '/sessions', navKey: 'sessions', color: 'lcars-orange' },
  { key: 'SessionChains', descKey: 'sectionSessionChains', icon: Swords, href: '/session-chains', navKey: 'sessionChains', color: 'lcars-orange' },
  { key: 'Personas', descKey: 'sectionPersonas', icon: Users, href: '/personas', navKey: 'personas', color: 'lcars-lavender' },
  { key: 'Objectives', descKey: 'sectionObjectives', icon: Target, href: '/objectives', navKey: 'objectives', color: 'lcars-blue' },
  { key: 'Projects', descKey: 'sectionProjects', icon: Globe, href: '/projects', navKey: 'projects', color: 'lcars-blue' },
  { key: 'Features', descKey: 'sectionFeatures', icon: Cpu, href: '/features', navKey: 'features', color: 'lcars-blue' },
  { key: 'Settings', descKey: 'sectionSettings', icon: Settings, href: '/settings', navKey: 'settings', color: 'lcars-blue' },
];

const keyConcepts = [
  { titleKey: 'conceptPersona', descKey: 'conceptPersonaDesc', icon: Users, color: 'lcars-lavender' },
  { titleKey: 'conceptObjective', descKey: 'conceptObjectiveDesc', icon: Target, color: 'lcars-blue' },
  { titleKey: 'conceptSession', descKey: 'conceptSessionDesc', icon: Rocket, color: 'lcars-orange' },
  { titleKey: 'conceptSessionChain', descKey: 'conceptSessionChainDesc', icon: Swords, color: 'lcars-cyan' },
  { titleKey: 'conceptProject', descKey: 'conceptProjectDesc', icon: Globe, color: 'lcars-blue' },
  { titleKey: 'conceptFinding', descKey: 'conceptFindingDesc', icon: BarChart3, color: 'lcars-orange' },
];

const odaSteps = [
  { titleKey: 'observeStep', descKey: 'observeDesc', icon: Eye, color: 'lcars-cyan' },
  { titleKey: 'decideStep', descKey: 'decideDesc', icon: Brain, color: 'lcars-lavender' },
  { titleKey: 'actStep', descKey: 'actDesc', icon: MousePointerClick, color: 'lcars-orange' },
];

export function Guide() {
  const { t } = useTranslation();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-lcars-blue" />
          <h1 className="text-3xl font-lcars tracking-wider uppercase text-lcars-blue">
            {t('guide.title')}
          </h1>
        </div>
        <p className="text-muted-foreground mt-1">{t('guide.subtitle')}</p>
      </div>
      <div className="lcars-header-bar" />

      {/* What is Mimic? */}
      <section className="space-y-6">
        <h2 className="text-xl font-lcars tracking-wider uppercase text-lcars-orange">
          {t('guide.whatIsMimic')}
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-lcars-cream/80 leading-relaxed">{t('guide.whatIsMimicDesc')}</p>
          </CardContent>
        </Card>

        {/* Observe-Decide-Act loop */}
        <div className="grid gap-4 md:grid-cols-3">
          {odaSteps.map((step, i) => (
            <div key={step.titleKey} className="flex items-start gap-3">
              <Card className={`flex-1 border-t-4 border-t-${step.color}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full bg-${step.color}/20 flex items-center justify-center`}>
                      <step.icon className={`h-4 w-4 text-${step.color}`} />
                    </div>
                    <CardTitle className={`text-${step.color}`}>{t(`guide.${step.titleKey}`)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(`guide.${step.descKey}`)}</p>
                </CardContent>
              </Card>
              {i < odaSteps.length - 1 && (
                <ChevronRight className="hidden md:block h-5 w-5 text-lcars-cream/30 mt-10 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Core Workflow */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-lcars tracking-wider uppercase text-lcars-orange">
            {t('guide.coreWorkflow')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('guide.coreWorkflowDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, i) => (
            <Link key={step.titleKey} to={step.href} className="group">
              <Card className="h-full transition-colors hover:border-lcars-orange/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full bg-${step.color}/20 flex items-center justify-center`}>
                      <span className={`font-lcars text-lg text-${step.color}`}>{i + 1}</span>
                    </div>
                    <div>
                      <step.icon className={`h-4 w-4 text-${step.color} mb-1`} />
                      <CardTitle className="text-sm">{t(`guide.${step.titleKey}`)}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(`guide.${step.descKey}`)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* App Sections */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-lcars tracking-wider uppercase text-lcars-orange">
            {t('guide.appSections')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('guide.appSectionsDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {appSections.map((section) => (
            <Link key={section.key} to={section.href} className="group">
              <Card className="h-full transition-colors hover:border-lcars-orange/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full bg-${section.color}/20 flex items-center justify-center`}>
                      <section.icon className={`h-4 w-4 text-${section.color}`} />
                    </div>
                    <CardTitle className="text-sm">{t(`nav.${section.navKey}`)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t(`guide.${section.descKey}`)}</CardDescription>
                  <span className={`inline-flex items-center gap-1 text-xs text-${section.color} mt-3 group-hover:underline`}>
                    {t('guide.goTo')} <ArrowRight className="h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Key Concepts */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-lcars tracking-wider uppercase text-lcars-orange">
            {t('guide.keyConcepts')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('guide.keyConceptsDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keyConcepts.map((concept) => (
            <Card key={concept.titleKey} className={`border-l-4 border-l-${concept.color}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <concept.icon className={`h-4 w-4 text-${concept.color}`} />
                  <CardTitle className="text-sm">{t(`guide.${concept.titleKey}`)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t(`guide.${concept.descKey}`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section>
        <Card className="border-lcars-orange/50 bg-lcars-orange/5">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-xl font-lcars tracking-wider uppercase text-lcars-orange">
              {t('guide.readyToStart')}
            </h2>
            <p className="text-muted-foreground">{t('guide.readyToStartDesc')}</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button asChild>
                <Link to="/personas">
                  <Users className="mr-2 h-4 w-4" />
                  {t('guide.createFirstPersona')}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/sessions">
                  <Rocket className="mr-2 h-4 w-4" />
                  {t('guide.createFirstSession')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
