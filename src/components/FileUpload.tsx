'use client';

import { useState } from 'react';
import { processUploadedFile, TransactionRow } from '../app/actions/parse-file';

interface FileUploadProps {
  onDataParsed: (data: TransactionRow[]) => void;
}

export default function FileUpload({ onDataParsed }: FileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('בנק הפועלים');
  

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('source', source);

    try {
      const results = await processUploadedFile(formData);
      onDataParsed(results);
    } catch (err) {
      alert('שגיאה בניתוח הקובץ עם Gemini AI. בדוק את ה-API Key או ה-Console.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">1. העלאת קובץ בנק / אשראי</h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">בחר קובץ אקסל (.xlsx)</label>
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="w-full text-sm text-gray-500 border border-gray-300 rounded-lg p-2 focus:outline-none cursor-pointer"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">מקור החשבון</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white"
          >
            <option value="בנק הפועלים">בנק הפועלים</option>
            <option value="בנק דיסקונט">בנק דיסקונט</option>
            <option value="כרטיס אשראי Max">כרטיס אשראי Max</option>
            <option value="ישראכרט">ישראכרט</option>
            <option value="כיסי ביט">כיסי ביט</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Gemini מנתח את הנתונים...' : 'העלה ועבד באמצעות AI'}
        </button>
      </form>
    </div>
  );
}