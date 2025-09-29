/**
 * 统一语言状态管理
 * 原则：以用户选择的语言为准，页面切换时保持选择状态
 */

import { translations } from './translations';

export type SupportedLocale = keyof typeof translations;
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh', 'ja'];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

// 语言状态管理类
class LanguageManager {
  private static instance: LanguageManager;
  private currentLocale: SupportedLocale = DEFAULT_LOCALE;
  private listeners: ((locale: SupportedLocale) => void)[] = [];

  private constructor() {
    // 从localStorage恢复用户选择的语言
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred-language');
      if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
        this.currentLocale = stored as SupportedLocale;
      }
    }
  }

  static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  // 获取当前语言
  getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  // 设置语言（用户主动选择）
  setLocale(locale: SupportedLocale) {
    if (!SUPPORTED_LOCALES.includes(locale)) {
      console.warn(`不支持的语言: ${locale}`);
      return;
    }

    this.currentLocale = locale;

    // 持久化用户选择
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', locale);
    }

    // 通知所有监听者
    this.listeners.forEach(listener => listener(locale));
  }

  // 添加语言变化监听器
  onLocaleChange(listener: (locale: SupportedLocale) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 获取翻译文本
  t(key: keyof typeof translations[SupportedLocale]): string {
    return translations[this.currentLocale][key] || translations[DEFAULT_LOCALE][key] || key;
  }

  // 生成本地化路径
  getLocalizedPath(path: string, targetLocale?: SupportedLocale): string {
    const locale = targetLocale || this.currentLocale;

    // 移除现有的语言前缀
    const cleanPath = path.replace(/^\/(en|zh|ja)(\/|$)/, '/');

    // 添加新的语言前缀（除了默认语言en）
    if (locale === DEFAULT_LOCALE) {
      return cleanPath === '/' ? '/' : cleanPath;
    }

    return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
  }

  // 从路径检测语言
  detectLocaleFromPath(pathname: string): SupportedLocale {
    const match = pathname.match(/^\/(en|zh|ja)\b/);
    if (match && SUPPORTED_LOCALES.includes(match[1] as SupportedLocale)) {
      return match[1] as SupportedLocale;
    }
    return DEFAULT_LOCALE; // 路径中没有语言前缀时，返回默认语言
  }
}

// 单例实例
export const languageManager = LanguageManager.getInstance();

// 便捷函数
export const getCurrentLocale = () => languageManager.getCurrentLocale();
export const setLocale = (locale: SupportedLocale) => languageManager.setLocale(locale);
export const t = (key: keyof typeof translations[SupportedLocale]) => languageManager.t(key);
export const getLocalizedPath = (path: string, locale?: SupportedLocale) =>
  languageManager.getLocalizedPath(path, locale);
export const detectLocaleFromPath = (pathname: string) =>
  languageManager.detectLocaleFromPath(pathname);