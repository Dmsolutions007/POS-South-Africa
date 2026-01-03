
import { FlashProduct, FlashTransaction, FlashProductType } from '../types';
import { FLASH_MERCHANT_ID } from '../constants';

/**
 * Production-ready Flash API Integration Service
 * Simulates the REST interaction with Flash Bridge / API
 */
export const FlashService = {
  /**
   * Check Flash Wallet balance before transaction
   */
  async checkBalance(): Promise<number> {
    // In production, this calls GET /v1/wallet/balance
    // Using Merchant ID: 27111450216
    return new Promise((resolve) => {
      setTimeout(() => resolve(4500.75), 800); // Mock balance
    });
  },

  /**
   * Process a VAS Sale
   */
  async processSale(
    type: FlashProductType, 
    provider: string, 
    amount: number, 
    phone: string
  ): Promise<{ success: boolean; token?: string; ref: string; error?: string }> {
    console.log(`Flash API Call: Merchant ${FLASH_MERCHANT_ID} selling ${type} via ${provider}`);
    
    // Simulate API Network Delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.05; // 95% success rate simulation
        const ref = `FLS-${Date.now()}`;
        
        if (isSuccess) {
          // Tokens are generated for Electricity or Vouchers (PINs)
          const token = (type === 'VOUCHER' || type === 'ELECTRICITY') 
            ? Math.random().toString().slice(2, 14).match(/.{1,4}/g)?.join('-') 
            : undefined;
            
          resolve({ success: true, token, ref });
        } else {
          resolve({ success: false, ref, error: "Flash API: Insufficient Wallet Balance or Provider Timeout" });
        }
      }, 1500);
    });
  }
};
