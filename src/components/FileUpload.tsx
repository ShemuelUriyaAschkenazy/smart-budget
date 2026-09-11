'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  analyzeUploadedFile,
  commitTransactionsImport,
  FileAnalysisResult,
  TransactionRow,
} from '../app/actions/parse-file';
import { getAccounts, AccountItem } from '../app/actions/account-actions';

interface FileUploadProps {
  onDataParsed: (data: TransactionRow[]) => void;
}

export default function FileUpload({ onDataParsed }: FileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('max');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [analysis, setAnalysis] = useState<FileAnalysisResult | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);

  const [successData, setSuccessData] = useState<{
    count: number;
    fileName: string;
    rows: TransactionRow[];
  } | null>(null);

  useEffect(() => {
    getAccounts(true).then((data) => {
      setAccounts(data);
    });
  }, []);

  const availableAccounts = accounts.filter((acc) => acc.provider === selectedProvider);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (provider === 'max') {
      setSelectedAccountId('ALL');
    } else {
      const filtered = accounts.filter((acc) => acc.provider === provider);
      setSelectedAccountId(filtered.length > 0 ? filtered[0].id : '');
    }
  };

  async function handleAnalyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAccountId && selectedProvider !== 'max') {
      return alert('נא לבחור חשבון/כרטיס להעלאה');
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('provider', selectedProvider);
    formData.append('accountId', selectedAccountId);

    try {
      const result = await analyzeUploadedFile(formData);
      setAnalysis(result);
    } catch (err: any) {
      alert(err.message || 'שגיאה בניתוח הקובץ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleConfirmImport = async () => {
    if (!analysis) return;
    setLoading(true);
    try {
      const payload = includeDuplicates
        ? [...analysis.newRows, ...analysis.duplicateRows]
        : analysis.newRows;

      const currentFileName = analysis.fileName || 'קובץ נטען';

      const saved = await commitTransactionsImport(
        payload,
        selectedAccountId,
        currentFileName,
        analysis.provider
      );

      onDataParsed(saved);

      // פתיחת מודל ההצלחה עם סיכום התנועות שנשמרו
      setSuccessData({
        count: saved.length,
        fileName: currentFileName,
        rows: saved,
      });

      setAnalysis(null);
      setIncludeDuplicates(false);
    } catch (err) {
      alert('אירעה שגיאה בשמירת הנתונים.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 mb-8 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">1. העלאת קובץ תנועות</h2>
      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">קובץ אקסל (.xlsx)</label>
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="w-full text-sm text-gray-500 border border-gray-300 rounded-lg p-2 focus:outline-none cursor-pointer"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">ספק / חברה</label>
          <select
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
          >
            <option value="max">Max</option>
            <option value="cal">כאל / Cal</option>
            <option value="isracard">ישראכרט</option>
            <option value="poalim">בנק הפועלים</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">שיוך חשבון</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
          >
            {selectedProvider === 'max' && (
              <option value="ALL">✨ כל הכרטיסים (פיצול לפי 4 ספרות)</option>
            )}
            {availableAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.last4Digits ? `(••${acc.last4Digits})` : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || accounts.length === 0}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'מפענח...' : 'טען קובץ'}
        </button>
      </form>

      {/* 1. מודל תצוגה מקדימה לפני יבוא */}
      {analysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="border-b pb-3">
              <h3 className="text-xl font-bold text-gray-900">תצוגה מקדימה - {analysis.sourceName}</h3>
              <p className="text-xs text-gray-500 mt-1">בדיקה מול כפילויות קיימות ב-Database.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-700 font-bold uppercase">תנועות חדשות</span>
                <p className="text-2xl font-black text-emerald-800 mt-1">{analysis.newRows.length}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-700 font-bold uppercase">כפילויות שנמצאו</span>
                <p className="text-2xl font-black text-amber-800 mt-1">{analysis.duplicateRows.length}</p>
              </div>
            </div>

            {analysis.duplicateRows.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50 max-h-40">
                <p className="text-xs font-bold text-gray-700 mb-2">תנועות כפולות שלא ייטענו:</p>
                {analysis.duplicateRows.map((item, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border border-gray-200 text-xs flex justify-between">
                    <div>
                      <span className="font-bold text-gray-800">{item.description}</span>
                      <span className="text-gray-400 mr-2">{item.date}</span>
                    </div>
                    <span className="font-bold text-gray-900 dir-ltr">₪{Number(item.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {analysis.duplicateRows.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="includeDupes"
                  checked={includeDuplicates}
                  onChange={(e) => setIncludeDuplicates(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="includeDupes" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  ייבא גם את התנועות הכפולות בכל זאת
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setAnalysis(null);
                  setIncludeDuplicates(false);
                }}
                className="px-5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'שומר...' : 'אישור ויבוא'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. מודל אישור בסיום טעינה מוצלחת */}
      {successData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="border-b pb-3 flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">התנועות נטענו בהצלחה!</h3>
                <p className="text-xs text-gray-500">
                  נקלטו <span className="font-bold text-emerald-600">{successData.count}</span> תנועות מתוך הקובץ "{successData.fileName}"
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50 max-h-60">
              <p className="text-xs font-bold text-gray-700 mb-2">פירוט התנועות שנקלטו כעת:</p>
              {successData.rows.map((tx, idx) => (
                <div key={idx} className="p-2 bg-white rounded border border-gray-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-800">{tx.description}</span>
                    <span className="text-gray-400 mr-2">({tx.date})</span>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-900 dir-ltr block">₪{Number(tx.amount).toFixed(2)}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                      {tx.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <Link
                href="/uploads"
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-lg transition flex items-center gap-1"
              >
                📂 צפה בכל ההעלאות בהיסטוריה ⬅
              </Link>

              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="px-5 py-2 text-xs font-bold bg-gray-900 hover:bg-black text-white rounded-lg transition"
              >
                סגור ואישור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}