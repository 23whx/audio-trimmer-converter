import { useState, useEffect } from 'react';
import { languageManager, type SupportedLocale, SUPPORTED_LOCALES } from '../lib/i18n/language-manager';

interface LanguageSwitcherProps {
  className?: string;
  currentPath?: string;
}

const languageLabels: Record<SupportedLocale, string> = {
  en: 'English',
  zh: '简体中文',
  ja: '日本語',
};

export default function LanguageSwitcher({ className = '', currentPath = '/' }: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(() => {
    // 优先从当前URL路径检测语言，确保显示与页面一致
    const pathLocale = languageManager.detectLocaleFromPath(currentPath);
    return pathLocale;
  });

  useEffect(() => {
    // 同步URL路径的语言状态到切换器
    const pathLocale = languageManager.detectLocaleFromPath(window.location.pathname);
    setCurrentLocale(pathLocale);

    // 监听语言变化
    const unsubscribe = languageManager.onLocaleChange(setCurrentLocale);
    return unsubscribe;
  }, []);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value as SupportedLocale;

    // 更新语言管理器状态 - 这会触发所有监听者更新
    languageManager.setLocale(newLocale);

    // 在编辑器页面时，不刷新页面，避免工作进度丢失
    const isEditorPage = window.location.pathname.includes('/editor');
    
    if (isEditorPage) {
      // 编辑器页面：仅更新URL，不刷新页面
      const newPath = languageManager.getLocalizedPath(window.location.pathname, newLocale);
      window.history.pushState({}, '', newPath);
    } else {
      // 其他页面：正常跳转
      const newPath = languageManager.getLocalizedPath(currentPath, newLocale);
      window.location.href = newPath;
    }
  };

  const options = SUPPORTED_LOCALES.map(locale => ({
    value: locale,
    label: languageLabels[locale],
    selected: locale === currentLocale
  }));

  return (
    <select
      className={className}
      value={currentLocale}
      onChange={handleLanguageChange}
    >
      {options.map(({ value, label, selected }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}