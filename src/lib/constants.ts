export const SYSTEM_CATEGORIES = {
  CREDIT_CARD_TRANSFER: {
    NAME: 'כיסוי חיוב אשראי (מנוטרל)',
    TYPE: 'transfer' as const,
    COUNT_IN_MAASER_DEFAULT: false,
    IS_NEUTRALIZED: true,
  },
  DEFAULT_UNCATEGORIZED: {
    NAME: 'שונות',
    TYPE: 'expense' as const,
    COUNT_IN_MAASER_DEFAULT: false,
  },
} as const;