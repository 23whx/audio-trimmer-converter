import { useState, useEffect } from 'react';
import { languageManager, type SupportedLocale } from './language-manager';
import { translations } from './translations';

/**
 * 自定义Hook，用于在React组件中监听语言变化
 * 当语言切换时，组件会自动重新渲染并更新翻译文本
 */
export function useLocale() {
  const [locale, setLocale] = useState<SupportedLocale>(() => 
    languageManager.getCurrentLocale()
  );

  useEffect(() => {
    // 监听语言变化，当语言改变时自动更新state，触发组件重新渲染
    const unsubscribe = languageManager.onLocaleChange(setLocale);
    return unsubscribe;
  }, []);

  // 返回当前语言和对应的翻译对象
  return {
    locale,
    t: translations[locale] || translations.en,
  };
}

/**
 * 便捷Hook，仅返回翻译对象
 */
export function useTranslations() {
  const { t } = useLocale();
  return t;
}
