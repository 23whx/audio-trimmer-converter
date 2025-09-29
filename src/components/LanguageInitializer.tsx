import { useEffect } from 'react';
import { languageManager, type SupportedLocale } from '../lib/i18n/language-manager';

interface LanguageInitializerProps {
  currentLocale: SupportedLocale;
}

/**
 * 确保客户端语言管理器与服务端渲染的语言一致
 * 但优先保持用户之前选择的语言偏好
 */
export default function LanguageInitializer({ currentLocale }: LanguageInitializerProps) {
  useEffect(() => {
    // 获取用户存储的语言偏好
    const storedLocale = localStorage.getItem('preferred-language') as SupportedLocale;

    if (storedLocale && storedLocale !== currentLocale) {
      // 如果用户之前选择了不同语言，自动跳转到用户偏好的语言版本
      const newPath = languageManager.getLocalizedPath(window.location.pathname, storedLocale);
      if (newPath !== window.location.pathname) {
        window.location.href = newPath;
        return;
      }
    }

    // 否则同步当前页面语言到语言管理器
    languageManager.setLocale(currentLocale);
  }, [currentLocale]);

  return null;
}