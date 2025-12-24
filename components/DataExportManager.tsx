import React, { useState } from 'react';
import { Download, FileText, TrendingUp, Users } from 'lucide-react';
import { CropType, Tray, Transaction, Customer } from '../types';
import {
  exportCropsSummary,
  exportTrayReport,
  exportFinancialReport,
  exportCustomerReport,
  exportCompleteReport,
} from '../utils/exportService';

interface DataExportManagerProps {
  crops: CropType[];
  trays: Tray[];
  transactions: Transaction[];
  customers: Customer[];
}

export const DataExportManager: React.FC<DataExportManagerProps> = ({
  crops,
  trays,
  transactions,
  customers,
}) => {
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const handleExport = (fn: () => void, name: string) => {
    try {
      console.log(`Initiating ${name} export...`);
      fn();
      console.log(`${name} export completed`);
    } catch (error) {
      console.error(`Error in ${name} export:`, error);
      alert(`Error: ${(error as Error).message}`);
    }
  };

  const exportReports = [
    {
      id: 'crops',
      title: 'Crops Summary',
      description: 'Overview of all crop varieties and their statistics',
      icon: FileText,
      onClick: () => handleExport(() => exportCropsSummary(crops, trays), 'Crops Summary'),
    },
    {
      id: 'trays',
      title: 'Tray Production Report',
      description: 'Detailed report of all trays and their status',
      icon: FileText,
      onClick: () => handleExport(() => exportTrayReport(trays, crops), 'Tray Report'),
    },
    {
      id: 'finance',
      title: 'Financial Report',
      description: 'Income, expenses, and profit analysis',
      icon: TrendingUp,
      onClick: () => handleExport(() => exportFinancialReport(transactions, customers, { from: dateFrom, to: dateTo }), 'Financial Report'),
    },
    {
      id: 'customers',
      title: 'Customers Report',
      description: 'Customer list with purchase history',
      icon: Users,
      onClick: () => handleExport(() => exportCustomerReport(customers, transactions), 'Customers Report'),
    },
    {
      id: 'complete',
      title: 'Complete Business Report',
      description: 'All data exported (crops, trays, finance, customers)',
      icon: Download,
      onClick: () => handleExport(() => exportCompleteReport(crops, trays, transactions, customers), 'Complete Report'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Data Export</h2>
        <p className="text-slate-600">Generate CSV reports for accounting and analysis</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Financial Report Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportReports.map((report) => {
          const IconComponent = report.icon;
          return (
            <button
              key={report.id}
              onClick={report.onClick}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-green-600 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <IconComponent className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
                <Download className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
              <p className="text-sm text-slate-600">{report.description}</p>
            </button>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Export Information</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• All reports are exported as CSV files that can be opened in Excel or Google Sheets</li>
          <li>• Complete Business Report exports all data as individual CSV files and a summary text file</li>
          <li>• Financial reports can be filtered by date range for specific periods</li>
          <li>• Data is exported from your local database and never sent to external services</li>
        </ul>
      </div>
    </div>
  );
};

export default DataExportManager;
