
/**
 * Application Configuration Manager
 * Handles environment-specific settings and business constants.
 */

export const CONFIG = {
  APP: {
    NAME: "Mzansi-Edge POS",
    VERSION: "2.4.0",
    ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production',
  },
  API: {
    // The Google GenAI key is strictly accessed from the environment
    GEMINI_KEY: process.env.API_KEY || "",
    // In a real hosting environment, these would be process.env.FLASH_ENDPOINT
    FLASH_BASE_URL: "https://api.flash.co.za/v1", // Mock placeholder
    FLASH_MERCHANT_ID: "27111450216",
  },
  BUSINESS: {
    CURRENCY: "ZAR",
    CURRENCY_SYMBOL: "R",
    TAX_RATE: 0.15, // South African VAT
  },
  STORAGE_KEYS: {
    MAIN_STATE: 'nexus_pos_data_v2',
  }
};

export const isProduction = CONFIG.APP.ENVIRONMENT === 'production';
export const hasGeminiKey = !!CONFIG.API.GEMINI_KEY;
