import { Suspense } from 'react';
import SetPasswordContent from './set-password-content';

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordContent />
    </Suspense>
  );
}
