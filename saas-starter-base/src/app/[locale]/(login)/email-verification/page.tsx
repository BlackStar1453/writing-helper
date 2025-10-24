import { Suspense } from 'react';
import EmailVerificationContent from './email-verification-content';

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailVerificationContent />
    </Suspense>
  );
} 