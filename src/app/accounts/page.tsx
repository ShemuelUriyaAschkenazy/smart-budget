'use client';

import { useState, useEffect } from 'react';
import {
  getAccounts,
  createAccountAction,
  toggleAccountActiveAction,
  deleteAccountAction,
  getMonthlyAccountsChecklist,
  AccountItem,
  AccountUploadStatus,
} from '../actions/account-actions';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [checklist, setChecklist] = useState<AccountUploadStatus[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'credit_card'>('credit_card');
  const [provider, setProvider] = useState('max');
  const [last4Digits, setLast4Digits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [accs, check] = await Promise.all([
        getAccounts(false),
        getMonthlyAccountsChecklist(selectedMonth),
      ]);
      setAccounts(accs);
      setChecklist(check);
    } catch (err) {
      setError('שגיאה בטעינת החשבונות');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createAccountAction(name, type, provider, last4Digits);
      setName('');
      setLast4Digits('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת החשבון');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await toggleAccountActiveAction(id, !currentStatus);
    await loadData();
  };

  const handleDelete = async (id: string, accName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את החשבון "${accName}"?`)) return;
    await deleteAccountAction(id);
    await loadData();
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🏦 ניהול חשבונות וכרטיסים</h1>
          <p className="text-gray-500 text-sm mt-1">הגדרת מקורות פיננסיים ומעקב טעינת קבצים חודשית</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">חודש מעקב:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
          />
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📋 מעקב קבצים שנטענו לחודש {selectedMonth}
        </h2>

        {checklist.length === 0 ? (
          <p className="text-xs text-gray-400">אין חשבונות פעילים מוגדרים במערכת.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklist.map((item) => (
              <div
                key={item.account.id}
                className={`p-3.5 rounded-xl border flex justify-between items-center ${
                  item.hasUploadedThisMonth
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-rose-50/60 border-rose-200'
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-gray-800">{item.account.name}</p>
                  <p className="text-xs text-gray-500 uppercase">
                    {item.account.provider} {item.account.last4Digits ? `(••${item.account.last4Digits})` : ''}
                  </p>
                </div>

                <div className="text-left">
                  {item.hasUploadedThisMonth ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                      🟢 נטען ({item.transactionsCount})
                    </span>
                  ) : (
                    <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full">
                      🔴 טרם הועלה
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* טופס הוספת חשבון */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">הוספת חשבון / כרטיס חדש</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">שם החשבון / הכרטיס</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='למשל: "מקס 7786", "הפועלים עו"ש"'
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-gray-700 mb-1">סוג</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
            >
              <option value="credit_card">כרטיס אשראי</option>
              <option value="bank">חשבון בנק</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-gray-700 mb-1">ספק / חברה</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
            >
              <option value="max">Max</option>
              <option value="isracard">ישראכרט</option>
              <option value="cal">כאל / Cal</option>
              <option value="poalim">בנק הפועלים</option>
            </select>
          </div>

          <div className="w-full sm:w-28">
            <label className="block text-xs font-semibold text-gray-700 mb-1">4 ספרות (רשות)</label>
            <input
              type="text"
              maxLength={4}
              value={last4Digits}
              onChange={(e) => setLast4Digits(e.target.value.replace(/\D/g, ''))}
              placeholder="1221"
              className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'מוסיף...' : 'הוסף חשבון'}
          </button>
        </form>
      </div>

      {/* טבלה */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">רשימת חשבונות מוגדרים ({accounts.length})</h2>
        </div>

        <table className="w-full text-sm text-right text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">שם החשבון</th>
              <th className="px-6 py-3">סוג</th>
              <th className="px-6 py-3">ספק</th>
              <th className="px-6 py-3">4 ספרות</th>
              <th className="px-6 py-3 text-center">סטטוס</th>
              <th className="px-6 py-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-900">{acc.name}</td>
                <td className="px-6 py-4">
                  {acc.type === 'bank' ? '🏦 בנק' : '💳 כרטיס אשראי'}
                </td>
                <td className="px-6 py-4 uppercase font-semibold text-gray-600">{acc.provider}</td>
                <td className="px-6 py-4 font-mono text-gray-800">{acc.last4Digits ? `••${acc.last4Digits}` : '-'}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleActive(acc.id, acc.isActive)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                      acc.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {acc.isActive ? 'פעיל' : 'מופסק (Enabled Off)'}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleDelete(acc.id, acc.name)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}