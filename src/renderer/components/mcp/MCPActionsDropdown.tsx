import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Store, Search, Settings, Trash2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { DisplayMCP } from '@/types/mcp';

interface MCPActionsDropdownProps {
  mcp: DisplayMCP;
  onDetail: (id: string) => void;
  onInspect: (mcp: DisplayMCP) => void;
  onConfigure: (mcp: DisplayMCP) => void;
  onDelete: (id: string) => void;
  mcpsWithInputs?: Set<string>;
}

export default function MCPActionsDropdown({
  mcp,
  onDetail,
  onInspect,
  onConfigure,
  onDelete,
  mcpsWithInputs,
}: MCPActionsDropdownProps) {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {mcp.source === 'market' && (
          <DropdownMenuItem onClick={() => onDetail(mcp.identifier)}>
            <Store className="h-3 w-3 mr-2" />
            {t('installed.buttons.detail')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onInspect(mcp)}>
          <Search className="h-3 w-3 mr-2" />
          {t('installed.buttons.inspect') || 'Inspect'}
        </DropdownMenuItem>
        {(mcpsWithInputs?.has(mcp.identifier)) && (
          <DropdownMenuItem onClick={() => onConfigure(mcp)}>
            <Settings className="h-3 w-3 mr-2" />
            {t('installed.buttons.config')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onDelete(mcp.identifier)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-2" />
          {t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}