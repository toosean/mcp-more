import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

export const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
} as const;

export const supportedLngs = Object.keys(resources);


// 异步初始化 i18n，从配置中读取语言设置
async function initializeI18n() {

  let configuredLanguage = 'en-US';

  try {
    // 尝试从配置中读取语言设置
    if (window.configAPI) {
      const config = await window.configAPI.getConfig();
      configuredLanguage = config.general.language || configuredLanguage;
    }
  } catch (error) {
    console.warn('Failed to load language from config, using system default:', error);
  }

  return i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: configuredLanguage,
      fallbackLng: configuredLanguage,
      debug: false,
      
      interpolation: {
        escapeValue: false,
      },
    });
}

// 导出初始化函数
export { initializeI18n };

export default i18n;