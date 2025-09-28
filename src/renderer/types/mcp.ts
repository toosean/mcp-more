export interface DisplayMCP {
  identifier: string;
  name: string;
  description: string | null;
  author: string | null;
  authorAvatarPath: string | null;
  version: string | null;
  downloads: number | null;
  rating: number | null;
  status: 'stopped' | 'starting' | 'running' | 'stopping';
  lastUpdated: string | null;
  installed: string | null;
  calls: number | null;
  source: 'manual' | 'json' | 'market' | null;
  runtimes?: string[] | null;
  missingRuntimes?: string[];
}