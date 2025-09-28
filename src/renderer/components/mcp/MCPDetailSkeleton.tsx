import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function MCPDetailSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Enhanced shimmer overlay effect */}
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>

      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        {/* Back button skeleton */}
        <div className="w-10 h-10 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse" 
             style={{ animationDelay: '0ms', animationDuration: '1.5s' }} />

        <div className="flex items-start gap-4">
          {/* Author Avatar skeleton */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 animate-pulse flex-shrink-0 mt-1" 
               style={{ animationDelay: '100ms', animationDuration: '1.5s' }} />

          <div className="space-y-1 min-w-0 flex-1">
            {/* Title skeleton */}
            <div className="h-8 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-2/3" 
                 style={{ animationDelay: '200ms', animationDuration: '1.5s' }} />
            {/* Subtitle skeleton */}
            <div className="h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-1/2" 
                 style={{ animationDelay: '300ms', animationDuration: '1.5s' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card Skeleton */}
          <Card className="overflow-hidden relative">
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
              style={{
                animation: 'shimmer 1.8s ease-in-out infinite',
                transform: 'translateX(-100%)',
              }}
            />

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse" 
                     style={{ animationDelay: '400ms', animationDuration: '1.5s' }} />
                <div className="h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-24" 
                     style={{ animationDelay: '450ms', animationDuration: '1.5s' }} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-full" 
                     style={{ animationDelay: '500ms', animationDuration: '1.5s' }} />
                <div className="h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-4/5" 
                     style={{ animationDelay: '550ms', animationDuration: '1.5s' }} />
                <div className="h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-3/5" 
                     style={{ animationDelay: '600ms', animationDuration: '1.5s' }} />
              </div>

            </CardContent>
          </Card>

          {/* Documentation Card Skeleton */}
          <Card className="overflow-hidden relative">
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
              style={{
                animation: 'shimmer 1.8s ease-in-out infinite',
                transform: 'translateX(-100%)',
              }}
            />

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse" 
                     style={{ animationDelay: '700ms', animationDuration: '1.5s' }} />
                <div className="h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-32" 
                     style={{ animationDelay: '750ms', animationDuration: '1.5s' }} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Documentation content skeleton */}
              <div className="space-y-3">
                {Array.from({ length: 12 }, (_, index) => (
                  <div 
                    key={index}
                    className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse"
                    style={{ 
                      animationDelay: `${800 + index * 50}ms`, 
                      animationDuration: '1.5s',
                      width: `${Math.random() * 40 + 60}%`
                    }} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          {/* Package Actions Card Skeleton */}
          <Card className="overflow-hidden relative">
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
              style={{
                animation: 'shimmer 1.8s ease-in-out infinite',
                transform: 'translateX(-100%)',
              }}
            />

            <CardHeader>
              <div className="h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-32" 
                   style={{ animationDelay: '1400ms', animationDuration: '1.5s' }} />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Install button skeleton */}
              <div className="h-10 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-full" 
                   style={{ animationDelay: '1450ms', animationDuration: '1.5s' }} />

              {/* Version info skeleton */}
              <div className="text-center">
                <div className="h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-3/4 mx-auto" 
                     style={{ animationDelay: '1500ms', animationDuration: '1.5s' }} />
              </div>
            </CardContent>
          </Card>

          {/* Package Information Card Skeleton */}
          <Card className="overflow-hidden relative">
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
              style={{
                animation: 'shimmer 1.8s ease-in-out infinite',
                transform: 'translateX(-100%)',
              }}
            />

            <CardHeader>
              <div className="h-5 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-40" 
                   style={{ animationDelay: '1550ms', animationDuration: '1.5s' }} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Package info items skeleton */}
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse" 
                           style={{ animationDelay: `${1600 + index * 50}ms`, animationDuration: '1.5s' }} />
                      <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-16" 
                           style={{ animationDelay: `${1620 + index * 50}ms`, animationDuration: '1.5s' }} />
                    </div>
                    <div className="h-3 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-20" 
                         style={{ animationDelay: `${1640 + index * 50}ms`, animationDuration: '1.5s' }} />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                {/* External links skeleton */}
                <div className="h-8 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-full" 
                     style={{ animationDelay: '1900ms', animationDuration: '1.5s' }} />
                <div className="h-8 bg-gradient-to-r from-muted to-muted/70 dark:from-muted/80 dark:to-muted/50 rounded animate-pulse w-full" 
                     style={{ animationDelay: '1950ms', animationDuration: '1.5s' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}