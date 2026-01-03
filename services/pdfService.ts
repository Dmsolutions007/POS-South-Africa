
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Sale, SaleItem } from '../types';
import { CURRENCY_SYMBOL, TAX_RATE, APP_NAME } from '../constants';

export const generateReceiptPDF = (sale: Sale, items: SaleItem[]) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 220] // Increased height to accommodate policy
  });

  const margin = 5;
  let y = 10;

  // Header - Brand & Address
  doc.setFontSize(14);
  doc.text(APP_NAME.toUpperCase(), 40, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8);
  doc.text("145 Rocky Street, Yeoville", 40, y, { align: 'center' });
  y += 4;
  doc.text("Johannesburg", 40, y, { align: 'center' });
  y += 4;
  doc.text("Tel: +27 65 845 6336", 40, y, { align: 'center' });
  y += 6;

  // Transaction Info
  doc.text(`Receipt: ${sale.id}`, 5, y);
  y += 4;
  doc.text(`Date: ${new Date(sale.timestamp).toLocaleString()}`, 5, y);
  y += 6;

  doc.line(margin, y, 75, y);
  y += 5;

  // Items
  items.forEach(item => {
    doc.text(item.productName.substring(0, 25), 5, y);
    doc.text(`${item.quantity} x ${item.unitPrice.toFixed(2)}`, 5, y + 4);
    doc.text(`${CURRENCY_SYMBOL}${item.totalPrice.toFixed(2)}`, 75, y + 4, { align: 'right' });
    y += 9;
  });

  doc.line(margin, y, 75, y);
  y += 6;

  // Totals
  doc.setFontSize(10);
  doc.text("TOTAL", 5, y);
  doc.text(`${CURRENCY_SYMBOL}${sale.totalAmount.toFixed(2)}`, 75, y, { align: 'right' });
  y += 5;
  doc.setFontSize(8);
  doc.text(`VAT (15%): ${CURRENCY_SYMBOL}${sale.taxAmount.toFixed(2)}`, 5, y);
  y += 10;

  // Footer & Policy
  doc.setFontSize(8);
  doc.text("RETURN POLICY:", 5, y);
  y += 4;
  const policy = "Returns accepted within 7 days with original receipt. Items must be in original packaging. No returns on perishable goods.";
  const splitPolicy = doc.splitTextToSize(policy, 70);
  doc.text(splitPolicy, 5, y);
  y += (splitPolicy.length * 4) + 4;

  doc.setFontSize(9);
  doc.text("Thank you for your business!", 40, y, { align: 'center' });
  y += 4;
  doc.setFontSize(7);
  doc.text("Software powered by Mzansi-Edge POS", 40, y, { align: 'center' });

  doc.save(`receipt_${sale.id}.pdf`);
};
