import { useTranslation } from 'react-i18next';
import { useConfig } from './use-config';
import { useEffect } from 'react';

export function useI18n() {
  const { t, i18n } = useTranslation();
  const { config, updateConfig } = useConfig();

  useEffect(() => {
    if (config?.general?.language && i18n.language !== config.general.language) {
      i18n.changeLanguage(config.general.language);
    }
  }, [config?.general?.language, i18n]);

  const changeLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
    
    if (config) {
      await updateConfig({
        general: {
          ...config.general,
          language,
        },
      });
    }
  };

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage,
  };
}