import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Sale, SaleItem, FlashTransaction } from '../types.ts';
import { CURRENCY_SYMBOL, TAX_RATE, APP_NAME } from '../constants.tsx';

export const generateReceiptPDF = (sale: Sale, items: SaleItem[]) => {
  const doc = new jsPDF({ unit: 'mm', format: [80, 220] });
  const margin = 5;
  let y = 10;

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

  doc.setFontSize(8);
  doc.text("SUBTOTAL", 5, y);
  doc.text(`${CURRENCY_SYMBOL}${(sale.totalAmount - sale.taxAmount).toFixed(2)}`, 75, y, { align: 'right' });
  y += 4;
  doc.text(`VAT (${(TAX_RATE * 100).toFixed(0)}%)`, 5, y);
  doc.text(`${CURRENCY_SYMBOL}${sale.taxAmount.toFixed(2)}`, 75, y, { align: 'right' });
  y += 6;

  doc.setFontSize(10);
  doc.text("TOTAL", 5, y);
  doc.text(`${CURRENCY_SYMBOL}${sale.totalAmount.toFixed(2)}`, 75, y, { align: 'right' });
  
  // Add Payment Details (Cash Tendered and Change)
  if (sale.paymentMethod === 'CASH' && sale.cashReceived !== undefined) {
    y += 6;
    doc.setFontSize(8);
    doc.text("CASH RECEIVED", 5, y);
    doc.text(`${CURRENCY_SYMBOL}${sale.cashReceived.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("CHANGE DUE", 5, y);
    doc.text(`${CURRENCY_SYMBOL}${(sale.changeDue || 0).toFixed(2)}`, 75, y, { align: 'right' });
    doc.setFont("helvetica", "normal");
  }

  y += 15;
  doc.setFontSize(8);
  doc.text("RETURN POLICY: 7 Days with receipt.", 40, y, { align: 'center' });
  doc.save(`receipt_${sale.id}.pdf`);
};

export const generateFlashReceipt = (tx: FlashTransaction) => {
  const doc = new jsPDF({ unit: 'mm', format: [80, 180] });
  let y = 10;

  doc.setFontSize(14);
  doc.text("FLASH VAS RECEIPT", 40, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.text(tx.provider.toUpperCase(), 40, y, { align: 'center' });
  y += 10;

  doc.setFontSize(8);
  doc.text(`Reference: ${tx.reference}`, 5, y); y += 5;
  doc.text(`Date: ${new Date(tx.timestamp).toLocaleString()}`, 5, y); y += 5;
  doc.text(`Customer: ${tx.customerPhone}`, 5, y); y += 10;

  doc.line(5, y, 75, y); y += 10;

  doc.setFontSize(12);
  doc.text(`${tx.type}: ${CURRENCY_SYMBOL}${tx.amount.toFixed(2)}`, 40, y, { align: 'center' });
  y += 12;

  // Add Payment Details for Flash
  if (tx.cashReceived !== undefined) {
    doc.setFontSize(8);
    doc.text(`Cash Tendered: ${CURRENCY_SYMBOL}${tx.cashReceived.toFixed(2)}`, 5, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Change Given: ${CURRENCY_SYMBOL}${(tx.changeDue || 0).toFixed(2)}`, 5, y);
    doc.setFont("helvetica", "normal");
    y += 10;
  }

  if (tx.token) {
    doc.setFontSize(14);
    doc.setFont("courier", "bold");
    doc.text("VOUCHER PIN / TOKEN:", 40, y, { align: 'center' });
    y += 10;
    doc.text(tx.token, 40, y, { align: 'center' });
    y += 10;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Thank you for using Flash!", 40, y + 10, { align: 'center' });

  doc.save(`flash_${tx.reference}.pdf`);
};