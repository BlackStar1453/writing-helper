import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser } from '@/lib/db/queries';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import SWRProvider from '@/components/providers/swr-provider';

export const metadata: Metadata = {
  title: {
    default: 'Writing Assistant - AI-Powered Grammar Checker',
    template: '%s | Writing Assistant'
  },
  description: 'AI-powered writing assistant that helps you improve your English writing skills with real-time grammar checking and intelligent suggestions.',
  keywords: [
    'AI dictionary',
    'AI explanation tool',
    'one click explanation',
    'desktop dictionary',
    'browser extension',
    'AI assistant',
    'language learning',
    'vocabulary tool',
    'instant translation',
    'context-aware dictionary'
  ],
  authors: [{ name: 'Elick Team' }],
  creator: 'Elick',
  publisher: 'Elick',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'),
  alternates: {
    canonical: '/',
    languages: {
      'zh': '/',
      'en': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    url: '/',
    title: 'Elick - AI Dictionary | Explain Everything with One Click',
    description: 'Elick is an AI-powered dictionary and explanation tool that helps you understand anything with just one click. Available as desktop app and browser extension.',
    siteName: 'Elick',
    images: [
      {
        url: '/img/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Elick - AI Dictionary',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elick - AI Dictionary | Explain Everything with One Click',
    description: 'Elick is an AI-powered dictionary and explanation tool that helps you understand anything with just one click.',
    images: ['/img/twitter-image.png'],
    creator: '@elick_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <NextIntlClientProvider messages={messages}>
          <SWRProvider
            fallback={{
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': getUser(),
            }}
          >
            {children}
            <Toaster position="bottom-right" richColors />
          </SWRProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
