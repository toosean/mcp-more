import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MCPCard from '@/components/mcp/MCPCard';
import { Filter, Loader2, ArrowLeft, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { MarketMcp, MarketCategory, SortBy } from '../types/market';
import { 
  getMarketMcps, 
  getMarketCategories 
} from '@/services/marketApi';

export default function Browse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();
  
  // 状态管理
  const [packages, setPackages] = useState<MarketMcp[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // 筛选和搜索状态
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [inputValue, setInputValue] = useState(searchParams.get('query') || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('popular');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 初始化数据加载
  useEffect(() => {
    loadInitialData();
  }, []);

  // 监听 URL 参数变化，更新搜索状态
  useEffect(() => {
    const queryFromUrl = searchParams.get('query') || '';
    if (queryFromUrl !== searchQuery) {
      setSearchQuery(queryFromUrl);
      setInputValue(queryFromUrl);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // 搜索和筛选变化时重新加载数据
  useEffect(() => {
    loadPackages();
  }, [searchQuery, selectedCategoryId, sortBy, currentPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [packagesRes, categoriesRes] = await Promise.all([
        getMarketMcps({ page: 1, pageSize: 20 }),
        getMarketCategories()
      ]);
      
      if (packagesRes.success) {
        setPackages(packagesRes.result.list);
        setTotalCount(packagesRes.result.total);
        // Calculate total pages based on pageSize
        setTotalPages(Math.ceil(packagesRes.result.total / 20));
      }
      
      if (categoriesRes.success) {
        setCategories(categoriesRes.result.list);
      }
    } catch (error) {
      console.error('Failed to load browse data:', error);
      toast({
        title: t('common.error'),
        description: t('browse.errors.loadData'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      setSearchLoading(true);
      
      const response = await getMarketMcps({
        page: currentPage,
        pageSize: 20,
        query: searchQuery || undefined,
        category: selectedCategoryId || undefined,
        sortBy: sortBy
      });
      
      if (response.success) {
        setPackages(response.result.list);
        setTotalCount(response.result.total);
        setTotalPages(Math.ceil(response.result.total / 20));
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast({
        title: t('common.error'),
        description: t('browse.errors.loadPackages'),
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };


  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleSearch = () => {
    const trimmedValue = inputValue.trim();
    setSearchQuery(trimmedValue);
    setCurrentPage(1);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    if (trimmedValue) {
      newSearchParams.set('query', trimmedValue);
    } else {
      newSearchParams.delete('query');
    }
    setSearchParams(newSearchParams);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setInputValue('');
    setSearchQuery('');
    setCurrentPage(1);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('query');
    setSearchParams(newSearchParams);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortBy) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('browse.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('browse.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('browse.description')}
          </p>
        </div>
      </div>

      {/* Search Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gradient-card rounded-lg border border-border/50">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder={t('market.search')}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-8"
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('browse.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t('browse.sort.popular')}</SelectItem>
              <SelectItem value="recent">{t('browse.sort.recent')}</SelectItem>
              <SelectItem value="rating">{t('browse.sort.rating')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleSearch}
            disabled={searchLoading}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Sidebar - Categories */}
        <div className="w-[380px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('browse.categories')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={selectedCategoryId === null ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleCategoryChange(null)}
              >
                {t('browse.allCategories')}
                <Badge variant="secondary" className="ml-auto">
                  {totalCount}
                </Badge>
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.identifier}
                  variant={selectedCategoryId === category.identifier ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleCategoryChange(category.identifier)}
                >
                  {category.title}
                  <Badge variant="secondary" className="ml-auto">
                    {category.count || 0}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Package List */}
        <div className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold pb-4">
                {selectedCategoryId 
                  ? categories.find(c => c.identifier === selectedCategoryId)?.title || t('browse.category')
                  : t('browse.allPackages')
                }
              </h2>
              {searchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <Badge variant="secondary">
              {totalCount} {t('browse.packages')}
            </Badge>
          </div>
          
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? t('browse.noSearchResults') : t('browse.noPackages')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {packages.map((mcp) => (
                <MCPCard
                  mcp={mcp}
                />
              ))}
            </div>
          )}
          
          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || searchLoading}
                >
                  {t('browse.pagination.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('browse.pagination.pageInfo', { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || searchLoading}
                >
                  {t('browse.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}