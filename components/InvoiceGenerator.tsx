import React from 'react';
import { FileText } from 'lucide-react';
import { Order, CropType, Customer } from '../types';

interface InvoiceGeneratorProps {
  order: Order;
  crops: CropType[];
  customers: Customer[];
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  order,
  crops,
  customers,
  businessName = 'Galway Sun Sprouts',
  businessEmail = 'info@galwaysunsprouts.ie',
  businessPhone = '+353 91 123 4567',
}) => {
  const customer = customers.find((c) => c.id === order.customerId);

  const generatePDF = () => {
    try {
      // Create HTML content for the invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${order.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: #333;
            }
            .invoice-container {
              max-width: 900px;
              margin: 0 auto;
              padding: 40px;
              border: 1px solid #ddd;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              border-bottom: 2px solid #10b981;
              padding-bottom: 20px;
            }
            .company-info h1 {
              margin: 0;
              color: #10b981;
              font-size: 28px;
            }
            .company-details {
              color: #666;
              font-size: 12px;
              line-height: 1.6;
            }
            .invoice-meta {
              text-align: right;
            }
            .invoice-meta p {
              margin: 5px 0;
              font-size: 12px;
            }
            .invoice-meta .invoice-number {
              font-size: 14px;
              font-weight: bold;
              color: #10b981;
            }
            .addresses {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              gap: 40px;
            }
            .address-block {
              flex: 1;
            }
            .address-block h3 {
              margin: 0 0 10px 0;
              color: #333;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .address-block p {
              margin: 3px 0;
              font-size: 12px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            table thead {
              background-color: #f3f4f6;
              border-top: 2px solid #10b981;
              border-bottom: 2px solid #10b981;
            }
            table th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              font-weight: bold;
              color: #333;
            }
            table td {
              padding: 12px;
              font-size: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            table tbody tr:last-child td {
              border-bottom: none;
            }
            .text-right {
              text-align: right;
            }
            .summary {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 40px;
            }
            .summary-box {
              width: 300px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 12px;
            }
            .summary-row.total {
              border-top: 2px solid #10b981;
              border-bottom: 2px solid #10b981;
              padding: 12px 0;
              font-weight: bold;
              font-size: 14px;
              color: #10b981;
            }
            .notes {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 11px;
              color: #666;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 10px;
              color: #999;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              background-color: #dbeafe;
              color: #1e40af;
              border-radius: 3px;
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>${businessName}</h1>
                <div class="company-details">
                  <p>${businessPhone}</p>
                  <p>${businessEmail}</p>
                </div>
              </div>
              <div class="invoice-meta">
                <div class="invoice-number">Invoice #${order.id.substring(0, 8).toUpperCase()}</div>
                <p>Date: ${new Date(order.date).toLocaleDateString()}</p>
                <p>Due: ${new Date(order.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="addresses">
              <div class="address-block">
                <h3>Bill To:</h3>
                <p><strong>${customer?.name || 'Unknown Customer'}</strong></p>
                <p>${customer?.contact || ''}</p>
                <p>${customer?.email || ''}</p>
              </div>
              <div class="address-block">
                <h3>Order Status:</h3>
                <div class="status-badge">${order.status.toUpperCase()}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map((item) => {
                    const crop = crops.find((c) => c.id === item.cropId);
                    return `
                  <tr>
                    <td>${crop?.name || 'Unknown'}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">€${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">€${item.subtotal.toFixed(2)}</td>
                  </tr>
                `;
                  })
                  .join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-box">
                <div class="summary-row">
                  <span>Subtotal:</span>
                  <span>€${order.totalAmount.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                  <span>TOTAL:</span>
                  <span>€${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            ${
              order.notes
                ? `
            <div class="notes">
              <strong>Notes:</strong><br>
              ${order.notes}
            </div>
            `
                : ''
            }

            <div class="footer">
              <p>Thank you for your business! For questions about this invoice, please contact us.</p>
              <p>${businessEmail} | ${businessPhone}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([invoiceHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Also try to open print dialog if user wants PDF
      alert('Invoice created! Open the HTML file in your browser and use Print (Ctrl+P) to save as PDF.');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice: ' + (error as Error).message);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={generatePDF}
        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        title="Generate and download invoice"
      >
        <FileText className="w-5 h-5" />
        <span>Invoice</span>
      </button>
    </div>
  );
};

export default InvoiceGenerator;
