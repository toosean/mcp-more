import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function MCPCardSkeleton() {
  return (
    <Card className="transition-all duration-300 bg-gradient-card border-border/50 overflow-hidden relative">
      {/* Enhanced shimmer overlay effect - different intensity for light/dark modes */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
        style={{
          animation: 'shimmer 1.8s ease-in-out infinite',
          transform: 'translateX(-100%)',
        }}
      />
      
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Avatar skeleton */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 animate-pulse flex-shrink-0" 
                 style={{ animationDelay: '0ms', animationDuration: '1.5s' }} />
            
            <div className="space-y-1 min-w-0 flex-1">
              {/* Title skeleton */}
              <div className="h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-3/4" 
                   style={{ animationDelay: '100ms', animationDuration: '1.5s' }} />
              {/* Author and version skeleton */}
              <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-1/2" 
                   style={{ animationDelay: '200ms', animationDuration: '1.5s' }} />
            </div>
          </div>
          
          {/* Rating skeleton */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse" 
                 style={{ animationDelay: '300ms', animationDuration: '1.5s' }} />
            <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-8" 
                 style={{ animationDelay: '350ms', animationDuration: '1.5s' }} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Description skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-full" 
               style={{ animationDelay: '400ms', animationDuration: '1.5s' }} />
          <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-2/3" 
               style={{ animationDelay: '500ms', animationDuration: '1.5s' }} />
        </div>

        {/* Stats skeleton */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse" 
                 style={{ animationDelay: '600ms', animationDuration: '1.5s' }} />
            <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-12" 
                 style={{ animationDelay: '650ms', animationDuration: '1.5s' }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-8" 
                 style={{ animationDelay: '700ms', animationDuration: '1.5s' }} />
            <div className="h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-16" 
                 style={{ animationDelay: '750ms', animationDuration: '1.5s' }} />
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex gap-2 w-full">
          {/* Primary button skeleton */}
          <div className="h-8 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse flex-1" 
               style={{ animationDelay: '800ms', animationDuration: '1.5s' }} />
          {/* Detail button skeleton */}
          <div className="h-8 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-20" 
               style={{ animationDelay: '850ms', animationDuration: '1.5s' }} />
        </div>
      </CardFooter>
      
    </Card>
  );
}