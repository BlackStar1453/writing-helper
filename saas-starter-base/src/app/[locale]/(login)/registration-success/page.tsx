import { Suspense } from 'react';
import RegistrationSuccessContent from './registration-success-content';

export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationSuccessContent />
    </Suspense>
  );
} 