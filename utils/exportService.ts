import { CropType, Tray, Transaction, Customer } from '../types';

export interface ExportOptions {
  includeTransactions: boolean;
  includeTrayHistory: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

// CSV Export
export const generateCSV = (
  data: any[],
  filename: string,
  columns: string[]
): void => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const header = columns.join(',');
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv');
};

// Helper to download file
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  try {
    const blob = new Blob([content], { type: mimeType });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to download file: ${(error as Error).message}`);
  }
};

// Generate Crop Summary Report (CSV)
export const exportCropsSummary = (crops: CropType[], trays: Tray[]): void => {
  console.log('Exporting crops summary. Crops:', crops.length, 'Trays:', trays.length);
  try {
    if (!crops || crops.length === 0) {
      alert('No crops to export');
      return;
    }

    const cropData = crops.map((crop) => {
      const activeTrays = trays.filter(
        (t) => (t.cropTypeId === crop.id || t.cropTypeId2 === crop.id) && t.stage !== 'Harvested'
      );
      const harvestedTrays = trays.filter(
        (t) => (t.cropTypeId === crop.id || t.cropTypeId2 === crop.id) && t.stage === 'Harvested'
      );
      const totalYield = harvestedTrays.reduce((sum, t) => sum + (t.yield || 0), 0);

      return {
        'Crop Name': crop.name,
        'Scientific Name': crop.scientificName || '-',
        'Total Cycle (Days)': crop.soakHours / 24 + crop.germinationDays + crop.blackoutDays + crop.lightDays,
        'Active Trays': activeTrays.length,
        'Harvested Trays': harvestedTrays.length,
        'Total Yield (g)': totalYield,
        'Estimated Price per Tray': `€${crop.pricePerTray}`,
        'Difficulty': crop.difficulty || '-',
      };
    });

  generateCSV(cropData, `crops-summary-${new Date().toISOString().split('T')[0]}`, [
    'Crop Name',
    'Scientific Name',
    'Total Cycle (Days)',
    'Active Trays',
    'Harvested Trays',
    'Total Yield (g)',
    'Estimated Price per Tray',
    'Difficulty',
  ]);
  } catch (error) {
    alert('Error exporting crops summary: ' + (error as Error).message);
  }
};

// Generate Tray Production Report (CSV)
export const exportTrayReport = (trays: Tray[], crops: CropType[]): void => {
  try {
    if (!trays || trays.length === 0) {
      alert('No trays to export');
      return;
    }
    const trayData = trays.map((tray) => {
    const crop = crops.find((c) => c.id === tray.cropTypeId);
    const crop2 = crops.find((c) => c.id === tray.cropTypeId2);
    const startDate = new Date(tray.plantedAt || tray.startDate);
    const daysGrowing = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      'Tray ID': tray.id,
      'Crop': crop?.name || 'Unknown',
      'Secondary Crop': crop2?.name || '-',
      'Location': tray.location,
      'Current Stage': tray.stage,
      'Start Date': new Date(tray.plantedAt || tray.startDate).toLocaleDateString(),
      'Days Growing': daysGrowing,
      'Yield (g)': tray.yield || '-',
      'Expected Yield (g)': crop?.estimatedYieldPerTray || '-',
      'Notes': tray.notes || '-',
    };
  });

    generateCSV(trayData, `tray-report-${new Date().toISOString().split('T')[0]}`, [
      'Tray ID',
      'Crop',
      'Secondary Crop',
      'Location',
      'Current Stage',
      'Start Date',
      'Days Growing',
      'Yield (g)',
      'Expected Yield (g)',
      'Notes',
    ]);
  } catch (error) {
    console.error('Error exporting tray report:', error);
    alert('Error exporting tray report: ' + (error as Error).message);
  }
};

// Generate Financial Report (CSV)
export const exportFinancialReport = (
  transactions: Transaction[],
  customers: Customer[],
  dateRange?: { from: string; to: string }
): void => {
  try {
    if (!transactions || transactions.length === 0) {
      alert('No transactions to export');
      return;
    }
    let filtered = transactions;

  if (dateRange) {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    filtered = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= from && date <= to;
    });
  }

  const reportData = filtered.map((trans) => {
    const customer = customers.find((c) => c.id === trans.customerId);
    return {
      'Date': new Date(trans.date).toLocaleDateString(),
      'Type': trans.type === 'income' ? 'Income' : 'Expense',
      'Category': trans.category,
      'Amount (€)': trans.amount,
      'Customer/Payee': trans.payee || customer?.name || '-',
      'Description': trans.description,
      'Business Expense': trans.isBusinessExpense ? 'Yes' : 'No',
    };
  });

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const profit = totalIncome - totalExpense;

  const summary = [
    { 'Date': 'SUMMARY', 'Type': '', 'Category': '', 'Amount (€)': '', 'Customer/Payee': '', 'Description': '', 'Business Expense': '' },
    { 'Date': '', 'Type': 'TOTAL INCOME', 'Category': '', 'Amount (€)': totalIncome, 'Customer/Payee': '', 'Description': '', 'Business Expense': '' },
    { 'Date': '', 'Type': 'TOTAL EXPENSE', 'Category': '', 'Amount (€)': totalExpense, 'Customer/Payee': '', 'Description': '', 'Business Expense': '' },
    { 'Date': '', 'Type': 'NET PROFIT', 'Category': '', 'Amount (€)': profit, 'Customer/Payee': '', 'Description': '', 'Business Expense': '' },
  ];

    generateCSV([...reportData, ...summary], `financial-report-${new Date().toISOString().split('T')[0]}`, [
      'Date',
      'Type',
      'Category',
      'Amount (€)',
      'Customer/Payee',
      'Description',
      'Business Expense',
    ]);
  } catch (error) {
    console.error('Error exporting financial report:', error);
    alert('Error exporting financial report: ' + (error as Error).message);
  }
};

// Generate Customer Report (CSV)
export const exportCustomerReport = (customers: Customer[], transactions: Transaction[]): void => {
  try {
    if (!customers || customers.length === 0) {
      alert('No customers to export');
      return;
    }
    const customerData = customers.map((customer) => {
    const customerTransactions = transactions.filter((t) => t.customerId === customer.id);
    const totalPurchases = customerTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      'Name': customer.name,
      'Type': customer.type,
      'Contact': customer.contact,
      'Email': customer.email,
      'Total Purchases (€)': totalPurchases,
      'Transaction Count': customerTransactions.length,
      'Notes': customer.notes || '-',
    };
  });

    generateCSV(customerData, `customers-report-${new Date().toISOString().split('T')[0]}`, [
      'Name',
      'Type',
      'Contact',
      'Email',
      'Total Purchases (€)',
      'Transaction Count',
      'Notes',
    ]);
  } catch (error) {
    console.error('Error exporting customer report:', error);
    alert('Error exporting customer report: ' + (error as Error).message);
  }
};

// Generate Complete Business Report (CSV)
export const exportCompleteReport = (
  crops: CropType[],
  trays: Tray[],
  transactions: Transaction[],
  customers: Customer[]
): void => {
  try {
    const report: string[] = [];

  // Header
  report.push('GALWAY SUN SPROUTS - COMPLETE BUSINESS REPORT');
  report.push(`Generated: ${new Date().toLocaleString()}`);
  report.push('');

  // Summary Section
  report.push('=== SUMMARY ===');
  report.push(`Total Crops: ${crops.length}`);
  report.push(`Active Trays: ${trays.filter((t) => t.stage !== 'Harvested').length}`);
  report.push(`Harvested Trays: ${trays.filter((t) => t.stage === 'Harvested').length}`);
  report.push(`Total Customers: ${customers.length}`);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  report.push(`Total Income: €${totalIncome.toFixed(2)}`);
  report.push(`Total Expenses: €${totalExpense.toFixed(2)}`);
  report.push(`Net Profit: €${(totalIncome - totalExpense).toFixed(2)}`);
  report.push('');

  const content = report.join('\n');
  downloadFile(content, `complete-report-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');

    // Also export individual CSVs
    exportCropsSummary(crops, trays);
    exportTrayReport(trays, crops);
    exportFinancialReport(transactions, customers);
    exportCustomerReport(customers, transactions);
  } catch (error) {
    alert('Error exporting complete report: ' + (error as Error).message);
  }
};
