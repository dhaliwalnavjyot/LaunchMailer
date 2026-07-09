import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Settings as SettingsIcon, 
  LogOut,
  Mail,
  MessageSquare
} from 'lucide-react';
import { clearToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useGetMe } from '@workspace/api-client-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: me } = useGetMe({ 
    query: { 
      retry: false 
    } 
  });

  const handleLogout = () => {
    clearToken();
    setLocation('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Campaigns', path: '/campaigns', icon: Send },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="w-5 h-5" />
            <MessageSquare className="w-4 h-4 -ml-3 mt-3 bg-card rounded-full" />
            <span className="font-sans font-bold text-lg tracking-tight ml-1 text-foreground">LaunchMailer</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-xs font-medium text-foreground truncate">Admin</span>
              <span className="text-xs text-muted-foreground truncate">{me?.email || 'Loading...'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 md:p-8 max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}