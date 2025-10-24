// Simplified promotions module
// This is a placeholder to maintain compatibility with existing code

export interface Promotion {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  active: boolean;
}

/**
 * Find the best auto promotion for a user
 * Returns null as promotions are not implemented yet
 */
export async function findBestAutoPromotion(userId: string): Promise<Promotion | null> {
  // Placeholder: No promotions available
  return null;
}

/**
 * Apply a promotion to a price
 * Returns the original price as promotions are not implemented yet
 */
export function applyPromotion(price: number, promotion: Promotion | null): number {
  if (!promotion) {
    return price;
  }

  if (promotion.type === 'percentage') {
    return price * (1 - promotion.discount / 100);
  } else {
    return Math.max(0, price - promotion.discount);
  }
}

