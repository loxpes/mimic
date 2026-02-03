import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  Target,
  Settings,
  Sparkles,
  FolderOpen,
  Link2,
  LogOut,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';

const navigation = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'projects', href: '/projects', icon: FolderOpen },
  { key: 'sessions', href: '/sessions', icon: PlayCircle },
  { key: 'sessionChains', href: '/session-chains', icon: Link2 },
  { key: 'personas', href: '/personas', icon: Users },
  { key: 'objectives', href: '/objectives', icon: Target },
  { key: 'features', href: '/features', icon: Sparkles },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r">
        <div className="flex h-16 items-center gap-2 px-6 border-b">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TF</span>
          </div>
          <span className="font-semibold text-lg">TestFarm</span>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.key}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section with Settings and User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t space-y-2">
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              location.pathname === '/settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Settings className="h-4 w-4" />
            {t('nav.settings')}
          </Link>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-2 h-auto font-normal"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium text-sm">{userInitial}</span>
                </div>
                <div className="flex flex-col items-start text-left overflow-hidden">
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {displayName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {user?.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
