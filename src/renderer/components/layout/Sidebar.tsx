import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { 
  Store, 
  Package, 
  Settings, 
  Search,
  Code,
  Terminal,
  Wrench
} from 'lucide-react';
import { Input } from '@/components/ui/input';

import logoProd from '@/assets/logo.png';
import logoDev from '@/assets/logo-dev.png';

const logo = process.env.NODE_ENV === 'development' ? logoDev : logoProd;

const getNavigation = (t: any) => [
  { name: t('navigation.market'), href: '/', icon: Store },
  { name: t('navigation.installed'), href: '/installed', icon: Package },
  { name: t('navigation.settings'), href: '/settings', icon: Settings },
];

const quickSetupItems = [
  { name: 'Claude Code', icon: Code },
  { name: 'Cursor', icon: Terminal },
  { name: 'Other', icon: Wrench },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useI18n();
  
  const navigation = getNavigation(t);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    } else {
      navigate('/browse');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="MCP More Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold">MCP More</h1>
            <p className="text-xs text-muted-foreground">Use More MCPs Better</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('market.search')}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
        </form>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/' && location.pathname === '/browse');
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 relative overflow-hidden',
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 text-blue-900 dark:text-blue-200 border border-blue-500/30 shadow-lg shadow-blue-500/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'

              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10"></div>
              )}
              <div className="relative z-10 flex items-center gap-3 w-full">
                <item.icon className="h-4 w-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quick Setup Section */}
      <div className="p-4 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {t('settings.quickSetup.title')}
        </div>
        <div className="space-y-1">
          {quickSetupItems.map((item) => (
            <button
              key={item.name}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}