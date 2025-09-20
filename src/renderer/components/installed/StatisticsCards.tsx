import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Play, Package } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Odometer } from '@/components/ui/odometer';

interface StatisticsCardsProps {
  totalCalls: number;
  runningCount: number;
  totalInstalled: number;
}

export default function StatisticsCards({
  totalCalls,
  runningCount,
  totalInstalled,
}: StatisticsCardsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-indigo-600/20 border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-indigo-400/10"></div>
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-200">
            {t('installed.stats.totalCalls')}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <Odometer
              value={totalCalls}
              className="text-2xl font-bold text-cyan-800 dark:text-cyan-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-600/20 via-green-600/20 to-teal-600/20 border-emerald-500/30 shadow-lg shadow-emerald-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-teal-400/10"></div>
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-200">
            {t('installed.stats.currentlyRunning')}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <Odometer
              value={runningCount}
              className="text-2xl font-bold text-emerald-800 dark:text-emerald-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 border-violet-500/30 shadow-lg shadow-violet-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-transparent to-fuchsia-400/10"></div>
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-200">
            {t('installed.stats.totalInstalled')}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <Odometer
              value={totalInstalled}
              className="text-2xl font-bold text-violet-800 dark:text-violet-100"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}