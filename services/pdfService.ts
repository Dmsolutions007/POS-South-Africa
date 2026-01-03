
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Sale, SaleItem } from '../types';
import { CURRENCY_SYMBOL, TAX_RATE } from '../constants';

export const generateReceiptPDF = (sale: Sale, items: SaleItem[]) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200] // Typical thermal receipt width (80mm)
  });

  const margin = 5;
  let y = 10;

  doc.setFontSize(14);
  doc.text("NEXUS POS RETAIL", 40, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8);
  doc.text("Johannesburg, South Africa", 40, y, { align: 'center' });
  y += 4;
  doc.text(`Receipt: ${sale.id}`, 5, y);
  y += 4;
  doc.text(`Date: ${new Date(sale.timestamp).toLocaleString()}`, 5, y);
  y += 6;

  doc.line(margin, y, 75, y);
  y += 5;

  items.forEach(item => {
    doc.text(item.productName.substring(0, 25), 5, y);
    doc.text(`${item.quantity} x ${item.unitPrice.toFixed(2)}`, 5, y + 4);
    doc.text(`${CURRENCY_SYMBOL}${item.totalPrice.toFixed(2)}`, 75, y + 4, { align: 'right' });
    y += 9;
  });

  doc.line(margin, y, 75, y);
  y += 6;

  doc.setFontSize(10);
  doc.text("TOTAL", 5, y);
  doc.text(`${CURRENCY_SYMBOL}${sale.totalAmount.toFixed(2)}`, 75, y, { align: 'right' });
  y += 5;
  doc.setFontSize(8);
  doc.text(`VAT (15%): ${CURRENCY_SYMBOL}${sale.taxAmount.toFixed(2)}`, 5, y);
  y += 8;

  doc.text("Thank you for your business!", 40, y, { align: 'center' });
  y += 4;
  doc.text("Please keep this receipt as proof of purchase.", 40, y, { align: 'center' });

  doc.save(`receipt_${sale.id}.pdf`);
};
