import { NextRequest, NextResponse } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const protectedRoutes = '/dashboard';

export async function middleware(request: NextRequest) {
    // 只在开发环境输出详细日志
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        console.log('=== Middleware start ===', request.nextUrl.pathname);
    }

    // Skip middleware for auth callback - let it be handled directly
    if (request.nextUrl.pathname === '/auth/callback') {
        if (isDev) {
            console.log('=== Skipping middleware for auth callback ===');
        }
        return NextResponse.next();
    }

    // Step 1: Handle i18n routing
    const handleI18nRouting = createIntlMiddleware(routing);
    const response = handleI18nRouting(request);

    if (isDev) {
        console.log('I18n middleware result:', {
            originalPath: request.nextUrl.pathname,
            responseStatus: response.status,
            redirectLocation: response.headers.get('location'),
            responseUrl: response.url
        });
    }

    // If i18n middleware is redirecting, return that immediately
    if (response.headers.get('location')) {
        if (isDev) {
            console.log('=== Returning i18n redirect ===');
        }
        return response;
    }

    // Step 2: Handle authentication logic
    const { pathname } = request.nextUrl;
    const sessionCookie = request.cookies.get('session');

    if (isDev) {
        console.log('Session cookie check:', {
            hasSessionCookie: !!sessionCookie,
            cookieValue: sessionCookie?.value ? `${sessionCookie.value.substring(0, 20)}...` : 'none'
        });
    }

    // Detect locale from pathname
    let locale = 'en'; // default locale
    let pathnameWithoutLocale = pathname;

    if (pathname.startsWith('/en')) {
        locale = 'en';
        pathnameWithoutLocale = pathname.substring('/en'.length) || '/';
    }

    if (isDev) {
        console.log('Final locale detection:', { pathname, locale, pathnameWithoutLocale });
    }

    const isProtectedRoute = pathnameWithoutLocale.startsWith(protectedRoutes);

    if (isDev) {
        console.log('Route protection check:', {
            isProtectedRoute,
            protectedRoutes,
            pathnameWithoutLocale
        });
    }

    // 2.1: Redirect to sign-in if trying to access a protected route without a session
    if (isProtectedRoute && !sessionCookie) {
        if (isDev) {
            console.log('=== REDIRECTING: No session cookie for protected route ===');
        }
        return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
    }

    // 2.2: Refresh the session token if it exists
    if (sessionCookie && request.method === 'GET') {
        try {
            if (isDev) {
                console.log('Attempting to verify session token...');
            }
            const parsed = await verifyToken(sessionCookie.value);
            if (isDev) {
                console.log('Session token verified successfully:', { userId: parsed.user?.id });
            }

            const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // The i18n middleware already created the response, so we modify it
            response.cookies.set({
                name: 'session',
                value: await signToken({ ...parsed, expires: expiresInOneDay.toISOString() }),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                expires: expiresInOneDay
            });

            if (isDev) {
                console.log('Session token refreshed successfully');
            }
        } catch (error) {
            if (isDev) {
                console.error('=== SESSION VERIFICATION FAILED ===', error);
            }
            response.cookies.delete('session');
            if (isProtectedRoute) {
                if (isDev) {
                    console.log('=== REDIRECTING: Session verification failed for protected route ===');
                }
                // If token verification fails on a protected route, redirect to sign-in
                return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
            }
        }
    }

    if (isDev) {
        console.log('=== Middleware completed, allowing request ===');
    }
    return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

