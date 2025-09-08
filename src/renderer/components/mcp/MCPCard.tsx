import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Star, Settings, Eye } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface MCPCardProps {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  categories: string[];
  type: string;
  isInstalled?: boolean;
  onInstall?: (id: string) => void;
  onUninstall?: (id: string) => void;
  onConfigure?: (id: string) => void;
  onDetail?: (id: string) => void;
}

export default function MCPCard({
  id,
  name,
  description,
  author,
  version,
  downloads,
  rating,
  categories,
  type,
  isInstalled = false,
  onInstall,
  onUninstall,
  onConfigure,
  onDetail
}: MCPCardProps) {
  const { t } = useI18n();
  return (
    <Card className="group transition-all duration-300 hover:shadow-card hover:shadow-glow/10 bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              by {author} • v{version}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            {rating.toFixed(1)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.slice(0, 3).map((category) => (
            <Badge key={category} variant="secondary" className="text-xs px-2 py-0">
              {category}
            </Badge>
          ))}
          {categories.length > 3 && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              +{categories.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Download className="h-3 w-3" />
            {downloads.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">类型:</span>
            <Badge variant="outline" className="text-xs px-2 py-0">
              {t(`market.type.${type as 'local' | 'remote' | 'hybrid'}`)}
            </Badge>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="flex gap-2 w-full">
          {isInstalled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure?.(id)}
                className="flex-1"
              >
                <Settings className="h-3 w-3 mr-1" />
                Configure
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onUninstall?.(id)}
                className="flex-1"
              >
                Uninstall
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => onInstall?.(id)}
                size="sm"
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </Button>
              <Button
                onClick={() => onDetail?.(id)}
                variant="outline"
                size="sm"
                className="px-3"
              >
                <Eye className="h-3 w-3 mr-1" />
                Detail
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}