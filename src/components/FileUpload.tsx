'use client';

import { useState } from 'react';
import { processUploadedFile, TransactionRow } from '../app/actions/parse-file';

interface FileUploadProps {
  onDataParsed: (data: TransactionRow[]) => void;
}

export default function FileUpload({ onDataParsed }: FileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('Max Credit Card');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('source', source);

    try {
      const results = await processUploadedFile(formData);
      onDataParsed(results);
    } catch (err) {
      alert('Error parsing file with Gemini AI. Check console or API key.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">1. Upload Bank / Credit Card File</h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Excel File (.xlsx)</label>
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="w-full text-sm text-gray-500 border border-gray-300 rounded-lg p-2 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm focus:outline-none"
          >
            <option value="Discount Bank">Discount Bank</option>
            <option value="Max Credit Card">Max Credit Card</option>
            <option value="Isracard">Isracard</option>
            <option value="Bit Pockets">Bit Pockets</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Gemini is Analyzing...' : 'Upload & Process with AI'}
        </button>
      </form>
    </div>
  );
}