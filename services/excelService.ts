import * as XLSX from 'xlsx';
import { AppState } from '../types.ts';

export const exportToExcel = (state: AppState) => {
  const wb = XLSX.utils.book_new();

  // Products Sheet
  const productData = state.products.map(p => ({
    ID: p.id,
    Name: p.name,
    Category: p.category,
    Barcode: p.barcode,
    Price: p.price,
    'Cost Price': p.costPrice,
    Stock: p.stock,
    'Low Stock Alert': p.lowStockThreshold
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productData);
  XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

  // Sales Sheet
  const salesData = state.sales.map(s => ({
    ID: s.id,
    Date: new Date(s.timestamp).toLocaleString(),
    Total: s.totalAmount,
    VAT: s.taxAmount,
    Method: s.paymentMethod,
    CashierID: s.cashierId,
    CustomerID: s.customerId || 'Walk-in'
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesData);
  XLSX.utils.book_append_sheet(wb, wsSales, "Sales");

  // Offline Templates Instructions (Documentation)
  const instructions = [
    ["OFFLINE POS MIRROR SETUP"],
    ["1. Copy the 'Products' sheet data into your offline Excel master file."],
    ["2. Use the following formula for stock deduction in your offline sheet:"],
    ["   =OriginalStock - SUMIF(SalesTable[ProductID], [@ProductID], SalesTable[Quantity])"],
    ["3. For South African VAT (15%): Total / 1.15 to find base price."],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Setup Instructions");

  XLSX.writeFile(wb, `NexusPOS_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
};