import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['zh', 'en'],

  // Used when no locale matches
  defaultLocale: 'zh',

  // Only add locale prefix when needed (not for default locale)
  localePrefix: 'as-needed',

  // Disable automatic locale detection based on browser language
  localeDetection: false
});