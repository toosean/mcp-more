import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Profile } from 'src/config/types';
import { getIconComponent } from '@/utils/profile-icons';

interface AppSetupButtonProps {
  isConfigured: boolean;
  isSetupInProgress: boolean;
  isDisabled?: boolean;
  profiles: Profile[];
  currentLanguage: string;
  onSetup: (profileId?: string) => void;
  setupButtonText?: string;
  reconfigureText?: string;
  settingUpText?: string;
  selectProfileText?: string;
  noProfilesText?: string;
  className?: string;
}

export default function AppSetupButton({
  isConfigured,
  isSetupInProgress,
  isDisabled = false,
  profiles,
  currentLanguage,
  onSetup,
  setupButtonText,
  reconfigureText,
  settingUpText,
  selectProfileText,
  noProfilesText,
  className = ''
}: AppSetupButtonProps) {
  const defaultSetupText = currentLanguage === 'zh-CN' ? '一键配置' : 'Quick Setup';
  const defaultReconfigureText = currentLanguage === 'zh-CN' ? '重新配置' : 'Reconfigure';
  const defaultSettingUpText = currentLanguage === 'zh-CN' ? '配置中' : 'Setting up';
  const defaultSelectProfileText = currentLanguage === 'zh-CN' ? '配置特定档案' : 'Configure specific profile';
  const defaultNoProfilesText = currentLanguage === 'zh-CN' ? '暂无 Profile' : 'No profiles available';

  if (isSetupInProgress) {
    return (
      <Button disabled className={`w-full ${className}`}>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {settingUpText || defaultSettingUpText}
      </Button>
    );
  }

  return (
    <div className={`flex w-full ${className}`}>
      <Button
        onClick={() => onSetup()}
        disabled={isDisabled}
        className="flex-1 rounded-r-none"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        {isConfigured
          ? (reconfigureText || defaultReconfigureText)
          : (setupButtonText || defaultSetupText)
        }
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isDisabled}
            className="px-2 rounded-l-none border-l-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            variant="default"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {profiles.length > 0 ? (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {selectProfileText || defaultSelectProfileText}
              </div>
              {profiles.map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => onSetup(profile.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getIconComponent(profile.icon);
                      return <IconComponent className="h-4 w-4 text-primary" />;
                    })()}
                    <div className="flex flex-col">
                      <span className="font-medium">{profile.name}</span>
                      {profile.description && (
                        <span className="text-xs text-muted-foreground">
                          {profile.description}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          ) : (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {noProfilesText || defaultNoProfilesText}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
