import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MCPCard from '@/components/mcp/MCPCard';
import { TrendingUp, Loader2, Search, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { MarketMcp } from '../types/market';
import { 
  getMarketHome
} from '@/services/marketApi';


export default function Market() {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  // 状态管理
  const [packages, setPackages] = useState<MarketMcp[]>([]);
  const [trendingPackages, setTrendingPackages] = useState<MarketMcp[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化数据加载
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const response = await getMarketHome();
      
      if (response.success) {
        // 从同一个接口响应中提取 featured 和 trending 数据
        setPackages(response.result.featured);
        setTrendingPackages(response.result.trending);
      } else {
        throw new Error('Failed to load market data');
      }
    } catch (error) {
      console.error('Failed to load market data:', error);
      toast({
        title: "Error",
        description: "Failed to load market data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseAll = () => {
    navigate('/browse');
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading market data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {t('market.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('market.description')}
        </p>
      </div>


      {/* Trending Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Trending This Week</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingPackages.map((mcp) => (
            <MCPCard
              id={mcp.identifier}
              key={mcp.identifier}
              name={mcp.name}
              description={mcp.description || ''}
              author={mcp.author || ''}
              version={mcp.version || ''}
              downloads={mcp.downloads || 0}
              rating={mcp.rating || 0}
              categories={[]} // Categories will be handled separately in the backend
              type={mcp.type || ''}
            />
          ))}
        </div>
      </div>

      {/* Featured Packages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Featured Packages</h2>
          </div>
        </div>
        
        {packages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No packages available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((mcp) => (
              <MCPCard
                id={mcp.identifier}
                key={mcp.identifier}
                name={mcp.name}
                description={mcp.description || ''}
                author={mcp.author || ''}
                version={mcp.version || ''}
                downloads={mcp.downloads || 0}
                rating={mcp.rating || 0}
                categories={[]} // Categories will be handled separately in the backend
                type={mcp.type || ''}
              />
            ))}
          </div>
        )}
        
        <div className="flex flex-col items-center pt-6 space-y-3">
          <button
            onClick={handleBrowseAll}
            className="flex items-center gap-3 rounded-lg px-6 py-4 text-base font-medium transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 text-blue-900 dark:text-blue-200 border border-blue-500/30 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10"></div>
            <div className="relative z-10 flex items-center gap-3">
              <Search className="h-5 w-5" />
              Browse All Packages
            </div>
          </button>
          <p className="text-sm text-muted-foreground text-center">
            Discover and install new MCP packages with advanced search and filtering
          </p>
        </div>
      </div>
    </div>
  );
}