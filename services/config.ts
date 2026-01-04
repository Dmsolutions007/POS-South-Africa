
/**
 * Application Configuration Manager
 * Handles environment-specific settings and business constants.
 */

const getSafeEnv = (key: string): string => {
  try {
    // Check window.process first as we polyfill it in index.html
    // @ts-ignore
    if (window.process?.env?.[key]) return window.process.env[key];
    // Check standard process if defined
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  } catch (e) {
    // Fail silently
  }
  return "";
};

export const CONFIG = {
  APP: {
    NAME: "Mzansi-Edge POS",
    VERSION: "2.4.1",
    ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production',
  },
  API: {
    GEMINI_KEY: getSafeEnv('API_KEY'),
    FLASH_BASE_URL: "https://api.flash.co.za/v1",
    FLASH_MERCHANT_ID: "27111450216",
  },
  BUSINESS: {
    CURRENCY: "ZAR",
    CURRENCY_SYMBOL: "R",
    TAX_RATE: 0.15,
  },
  STORAGE_KEYS: {
    MAIN_STATE: 'mzansi_edge_pos_v2',
  }
};

export const hasGeminiKey = !!CONFIG.API.GEMINI_KEY;
