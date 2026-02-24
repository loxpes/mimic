import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Rocket,
  Users,
  Target,
  Settings,
  Cpu,
  Globe,
  Swords,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';

type NavGroup = {
  groupKey: string;
  color: 'orange' | 'lavender' | 'blue';
  items: { key: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
};

const navGroups: NavGroup[] = [
  {
    groupKey: 'command',
    color: 'orange',
    items: [
      { key: 'dashboard', href: '/', icon: LayoutDashboard },
      { key: 'sessions', href: '/sessions', icon: Rocket },
      { key: 'sessionChains', href: '/session-chains', icon: Swords },
    ],
  },
  {
    groupKey: 'personnel',
    color: 'lavender',
    items: [
      { key: 'personas', href: '/personas', icon: Users },
      { key: 'objectives', href: '/objectives', icon: Target },
    ],
  },
  {
    groupKey: 'ship',
    color: 'blue',
    items: [
      { key: 'guide', href: '/guide', icon: BookOpen },
      { key: 'projects', href: '/projects', icon: Globe },
      { key: 'features', href: '/features', icon: Cpu },
      { key: 'settings', href: '/settings', icon: Settings },
    ],
  },
];

// Static color map to avoid Tailwind purging issues with dynamic classes
const colorMap = {
  orange: {
    bar: 'bg-lcars-orange',
    text: 'text-lcars-orange',
    activeBg: 'bg-lcars-orange',
    activeText: 'text-black',
    hoverBg: 'bg-lcars-orange/15',
    hoverText: 'text-lcars-orange',
    border: 'border-lcars-orange',
  },
  lavender: {
    bar: 'bg-lcars-lavender',
    text: 'text-lcars-lavender',
    activeBg: 'bg-lcars-lavender',
    activeText: 'text-black',
    hoverBg: 'bg-lcars-lavender/15',
    hoverText: 'text-lcars-lavender',
    border: 'border-lcars-lavender',
  },
  blue: {
    bar: 'bg-lcars-blue',
    text: 'text-lcars-blue',
    activeBg: 'bg-lcars-blue',
    activeText: 'text-black',
    hoverBg: 'bg-lcars-blue/15',
    hoverText: 'text-lcars-blue',
    border: 'border-lcars-blue',
  },
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header with hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 bg-lcars-panel border-b border-lcars-orange/30 px-4 md:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-lcars-sm p-2 text-lcars-orange hover:bg-lcars-orange/15 transition-colors"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="font-lcars text-xl tracking-widest uppercase text-lcars-orange">
          Mimic
        </span>
      </div>

      {/* Backdrop overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-lcars-panel border-r border-lcars-orange/20 transition-transform duration-200 ease-in-out flex flex-col',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        role="navigation"
      >
        {/* LCARS Header with elbow curve */}
        <div className="relative flex-shrink-0">
          {/* Top orange bar */}
          <div className="h-10 bg-lcars-orange rounded-bl-lcars flex items-center justify-end pr-4">
            <span className="font-lcars text-2xl tracking-[0.3em] uppercase text-black">
              Mimic
            </span>
          </div>
          {/* Elbow connector */}
          <div className="flex">
            <div className="w-16 bg-lcars-orange" />
            <div className="w-2" />
            <div className="flex-1 h-3 bg-lcars-lavender rounded-full my-1" />
            <div className="w-2" />
          </div>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5" aria-label="Main navigation">
          {navGroups.map((group) => {
            const colors = colorMap[group.color];
            return (
              <div key={group.groupKey}>
                {/* Group header with color bar */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={cn('w-8 h-2 rounded-full', colors.bar)} />
                  <span className={cn('font-lcars text-xs tracking-widest uppercase', colors.text)}>
                    {t(`navGroup.${group.groupKey}`)}
                  </span>
                </div>

                {/* Group items */}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.href === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.key}
                        to={item.href}
                        onClick={closeMobileMenu}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lcars-sm px-4 py-2 text-sm font-lcars tracking-wider uppercase transition-colors',
                          isActive
                            ? cn(colors.activeBg, colors.activeText, 'font-bold')
                            : cn('text-lcars-cream/70', colors.hoverBg.replace('bg-', 'hover:bg-'), colors.hoverText.replace('text-', 'hover:text-'))
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {t(`nav.${item.key}`)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom decorative bar — 3 color segments */}
        <div className="flex-shrink-0 px-3 pb-4">
          <div className="flex gap-1 h-3">
            <div className="flex-[4] bg-lcars-orange rounded-full" />
            <div className="flex-[3] bg-lcars-lavender rounded-full" />
            <div className="flex-[3] bg-lcars-blue rounded-full" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-0 md:pl-72">
        <div className="p-8 pt-20 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
