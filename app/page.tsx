'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, Download, Calculator, TrendingUp, DollarSign, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface ProductRow {
  sku: string;
  title: string;
  current_price: number;
  cost_price: number;
  new_price?: number;
  margin_percent?: number;
  price_change?: number;
  [key: string]: any;
}

export default function PriceCalculator() {
  const [data, setData] = useState<ProductRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [marginTarget, setMarginTarget] = useState<number>(40);
  const [markupType, setMarkupType] = useState<'margin' | 'markup'>('margin');
  const [originalFileName, setOriginalFileName] = useState<string>('');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setOriginalFileName(file.name.replace('.csv', ''));

    Papa.parse(file, {
      complete: (results) => {
        const parsed = results.data as any[];
        if (parsed.length > 0) {
          setHeaders(Object.keys(parsed[0]));
          const processed = parsed.map((row: any) => ({
            ...row,
            current_price: parseFloat(row.price || row.current_price || 0),
            cost_price: parseFloat(row.cost || row.cost_price || 0),
          }));
          setData(processed);
        }
      },
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
  }, []);

  const calculatePrices = useCallback(() => {
    const calculated = data.map(row => {
      const cost = row.cost_price || 0;
      let newPrice = row.current_price;
      
      if (markupType === 'margin') {
        newPrice = cost / (1 - marginTarget / 100);
      } else {
        newPrice = cost * (1 + marginTarget / 100);
      }

      newPrice = Math.round(newPrice * 100) / 100;
      
      const marginAmount = newPrice - cost;
      const marginPercent = newPrice > 0 ? (marginAmount / newPrice) * 100 : 0;
      
      return {
        ...row,
        new_price: newPrice,
        margin_percent: Math.round(marginPercent * 100) / 100,
        price_change: Math.round((newPrice - row.current_price) * 100) / 100,
        new_price_shopify: newPrice.toFixed(2)
      };
    });
    
    setData(calculated);
  }, [data, marginTarget, markupType]);

  const downloadCSV = useCallback(() => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${originalFileName}_updated_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, originalFileName]);

  const downloadShopifyFormat = useCallback(() => {
    const shopifyData = data.map(row => ({
      Handle: row.handle || row.sku?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      Title: row.title,
      'Variant SKU': row.sku,
      'Variant Price': row.new_price_shopify || row.new_price,
      'Cost per item': row.cost_price
    }));
    
    const csv = Papa.unparse(shopifyData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shopify_import_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data]);

  const stats = {
    total: data.length,
    avgMargin: data.length > 0 
      ? (data.reduce((acc, row) => acc + (row.margin_percent || 0), 0) / data.length).toFixed(1)
      : 0,
    priceIncreases: data.filter(row => (row.price_change || 0) > 0).length,
    priceDecreases: data.filter(row => (row.price_change || 0) < 0).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Bulk Price Update Calculator</h1>
              <p className="text-slate-600">Upload your Shopify/retail CSV, set target margins, download ready-to-import prices</p>
            </div>
          </div>
        </div>

        {data.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors">
            <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
              <div className="bg-blue-50 p-4 rounded-full">
                <Upload className="w-12 h-12 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-900">Drop your CSV file here</p>
                <p className="text-sm text-slate-500">Supports Shopify exports, inventory reports, price lists</p>
                <p className="text-xs text-slate-400 mt-2">Required columns: sku, price/current_price, cost/cost_price</p>
              </div>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Select File
              </button>
            </label>
          </div>
        )}

        {data.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <div className="grid md:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Calculation Method</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setMarkupType('margin')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        markupType === 'margin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Margin %
                    </button>
                    <button
                      onClick={() => setMarkupType('markup')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        markupType === 'markup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Markup %
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Target {markupType === 'margin' ? 'Gross Margin' : 'Markup'} (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={marginTarget}
                      onChange={(e) => setMarginTarget(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="40"
                    />
                    <TrendingUp className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <button
                  onClick={calculatePrices}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Calculator className="w-5 h-5" />
                  Calculate New Prices
                </button>
              </div>

              {data[0]?.new_price && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Total SKUs</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <p className="text-xs text-green-600 uppercase font-semibold">Avg Margin</p>
                    <p className="text-2xl font-bold text-green-700">{stats.avgMargin}%</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <p className="text-xs text-blue-600 uppercase font-semibold">Price Increases</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.priceIncreases}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl">
                    <p className="text-xs text-red-600 uppercase font-semibold">Price Decreases</p>
                    <p className="text-2xl font-bold text-red-700">{stats.priceDecreases}</p>
                  </div>
                </div>
              )}
            </div>

            {data[0]?.new_price && (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={downloadCSV}
                  className="flex-1 md:flex-none bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Download Full Report
                </button>
                <button
                  onClick={downloadShopifyFormat}
                  className="flex-1 md:flex-none bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Shopify Format
                </button>
                <button
                  onClick={() => { setData([]); setHeaders([]); }}
                  className="flex-1 md:flex-none bg-white text-slate-700 border-2 border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Upload New File
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-600">Preview: First 50 rows shown</span>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Cost</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Current</th>
                      {data[0]?.new_price && (
                        <>
                          <th className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50">New Price</th>
                          <th className="px-4 py-3 text-right font-semibold text-green-700 bg-green-50">Margin %</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">Change</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={row.title}>{row.title}</td>
                        <td className="px-4 py-3 text-right font-mono">${row.cost_price?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">${row.current_price?.toFixed(2)}</td>
                        {row.new_price && (
                          <>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/50">
                              ${row.new_price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-green-700 bg-green-50/50">
                              {row.margin_percent?.toFixed(1)}%
                            </td>
                            <td className={`px-4 py-3 text-right font-mono ${(row.price_change || 0) > 0 ? 'text-red-600' : (row.price_change || 0) < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                              {row.price_change && row.price_change > 0 ? '+' : ''}${row.price_change?.toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
