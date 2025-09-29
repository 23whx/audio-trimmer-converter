export const SUPPORTED_LOCALES = ['en', 'zh', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function getStaticLocalePaths() {
  return SUPPORTED_LOCALES.map((lang) => ({ params: { lang } }));
}
