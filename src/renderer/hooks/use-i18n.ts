import { useTranslation } from 'react-i18next';
import { useConfig } from './use-config';
import { useEffect } from 'react';

export function useI18n() {
  const { t, i18n } = useTranslation();
  const { getConfig, updateConfig } = useConfig();

  // 监听配置变化，同步语言设置
  useEffect(() => {
    const loadLanguage = async () => {
      const config = await getConfig();
      if (config?.general?.language && i18n.language !== config.general.language) {
        // 只有当配置中的语言和当前 i18n 语言不一致时才更新
        i18n.changeLanguage(config.general.language).catch(error => {
          window.logAPI.warn('Failed to change language:', error);
        });
      }
    };
    loadLanguage();
  }, [getConfig, i18n]);

  const changeLanguage = async (language: string) => {
    try {
      const config = await getConfig();
      // 先更新 i18n 语言
      await i18n.changeLanguage(language);
      
      // 然后保存到配置中
      if (config) {
        await updateConfig({
          general: {
            ...config.general,
            language,
          },
        });
      }
    } catch (error) {
      window.logAPI.error('Failed to change language:', error);
      throw error;
    }
  };

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage,
  };
}