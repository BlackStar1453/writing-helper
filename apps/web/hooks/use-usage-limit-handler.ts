'use client';

import { useState, useCallback } from 'react';

interface UsageError {
  message: string;
  code: string;
  userPlan?: string;
  upgradeAction?: string;
}

interface UseUsageLimitHandlerReturn {
  isDialogOpen: boolean;
  usageError: UsageError | null;
  showUsageLimitDialog: (error: UsageError) => void;
  hideUsageLimitDialog: () => void;
  handleUsageError: (error: any) => boolean;
}

/**
 * Hook for handling usage limit errors and showing appropriate dialogs
 */
export function useUsageLimitHandler(): UseUsageLimitHandlerReturn {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [usageError, setUsageError] = useState<UsageError | null>(null);

  const showUsageLimitDialog = useCallback((error: UsageError) => {
    setUsageError(error);
    setIsDialogOpen(true);
  }, []);

  const hideUsageLimitDialog = useCallback(() => {
    setIsDialogOpen(false);
    setUsageError(null);
  }, []);

  /**
   * Handle usage errors from API responses
   * @param error - Error object from API response
   * @returns true if error was handled, false otherwise
   */
  const handleUsageError = useCallback((error: any): boolean => {
    // Check if it's a usage limit error
    if (error?.quotaExceeded || error?.code?.includes('LIMIT_EXCEEDED')) {
      const usageError: UsageError = {
        message: error.error || error.message || '使用量已达上限',
        code: error.code || 'USAGE_LIMIT_EXCEEDED',
        userPlan: error.userPlan,
        upgradeAction: error.upgradeAction
      };
      
      showUsageLimitDialog(usageError);
      return true;
    }

    // Check if it's an API error response with usage error
    if (error?.error && typeof error.error === 'object') {
      const apiError = error.error;
      if (apiError.code?.includes('LIMIT_EXCEEDED')) {
        const usageError: UsageError = {
          message: apiError.message || '使用量已达上限',
          code: apiError.code,
          userPlan: apiError.userPlan,
          upgradeAction: apiError.upgradeAction
        };
        
        showUsageLimitDialog(usageError);
        return true;
      }
    }

    return false;
  }, [showUsageLimitDialog]);

  return {
    isDialogOpen,
    usageError,
    showUsageLimitDialog,
    hideUsageLimitDialog,
    handleUsageError
  };
}

export default useUsageLimitHandler;
