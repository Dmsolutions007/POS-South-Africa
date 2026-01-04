/**
 * Application Configuration Manager
 */

const getBasePath = () => {
  const path = window.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
};

export const CONFIG = {
  APP: {
    NAME: "Mzansi-Edge POS",
    VERSION: "2.4.5",
    BASE_PATH: getBasePath(),
    BASE_URL: window.location.origin + getBasePath(),
  },
  API: {
    // Strictly using process.env.API_KEY as per the guidelines.
    GEMINI_KEY: process.env.API_KEY || "",
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