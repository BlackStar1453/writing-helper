'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withUser } from '@/lib/auth/middleware';

export const checkoutAction = withUser(async (formData, user) => {
  const priceId = formData.get('priceId') as string;
  const isAnnual = formData.get('isAnnual') === 'true';
  const annualDiscount = formData.get('annualDiscount') ? parseInt(formData.get('annualDiscount') as string) : 0;
  const useOwnApiKey = formData.get('useOwnApiKey') === 'true';
  const apiKeyDiscount = formData.get('apiKeyDiscount') ? parseInt(formData.get('apiKeyDiscount') as string) : 0;
  const promoCode = formData.get('promoCode') as string;
  const promoDiscount = formData.get('promoDiscount') ? parseFloat(formData.get('promoDiscount') as string) : 0;

  await createCheckoutSession({
    user,
    priceId,
    isAnnual,
    annualDiscount,
    useOwnApiKey,
    apiKeyDiscount,
    promoCode,
    promoDiscount
  });
});

export const customerPortalAction = withUser(async (_, user) => {
  const portalSession = await createCustomerPortalSession(user);
  redirect(portalSession.url);
});
