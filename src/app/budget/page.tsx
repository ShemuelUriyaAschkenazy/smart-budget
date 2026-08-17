'use client';

import { useState, useEffect } from 'react';
import {
  getBudgetVsActual,
  setCategoryBudgetAction,
  updateMaaserSettingsAction,
  MonthlyOverview,
  BudgetVsActualItem,
} from '../actions/budget-actions';

export default function BudgetPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [data, setData] = useState<MonthlyOverview | null>(null);
  const [editingBudgets, setEditingBudgets] = useState<{ [key: number]: number }>({});
  const [showMaaserSettings, setShowMaaserSettings] = useState(false);
  const [initBalInput, setInitBalInput] = useState(0);
  const [pctInput, setPctInput] = useState(10);

  const loadData = async () => {
    const overview = await getBudgetVsActual(selectedMonth);
    setData(overview);

    setInitBalInput(overview.maaser.initialBalance);
    setPctInput(overview.maaser.percentage);

    const initialMap: { [key: number]: number } = {};
    [
      ...(overview.incomeItems || []),
      ...(overview.expenseItems || []),
      ...(overview.savingsItems || []),
      ...(overview.donationItems || []),
    ].forEach((item) => {
      if (item) initialMap[item.categoryId] = item.budgetAmount || 0;
    });
    setEditingBudgets(initialMap);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const handleSaveBudget = async (categoryId: number) => {
    const amount = editingBudgets[categoryId] ?? 0;
    await setCategoryBudgetAction(selectedMonth, categoryId, amount);
    await loadData();
  };

  const handleSaveMaaserSettings = async () => {
    await updateMaaserSettingsAction(initBalInput, pctInput);
    setShowMaaserSettings(false);
    await loadData();
  };

  if (!data) return <div className="p-8 text-center text-gray-500">טוען נתוני תקציב ומעשר...</div>;

  const m = data.maaser;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-5xl mx-auto space-y-8">
      {/* כותרת ובחירת חודש */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">תקציב, חיסכון ומעשר כספים</h1>
          <p className="text-gray-500 text-sm mt-1">ניהול מאוזן של הכנסות, הוצאות, חסכונות ומעקב מעשר מצטבר</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">חודש:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
          />
        </div>
      </div>

      {/* כרטיס מיוחד: מעקב מעשר כספים מצטבר */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl shadow-sm border border-amber-200 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-amber-900 flex items-center gap-2">
            🪙 מעקב מעשר כספים (מצטבר)
          </h2>
          <button
            onClick={() => setShowMaaserSettings(!showMaaserSettings)}
            className="text-xs bg-amber-200/60 hover:bg-amber-200 text-amber-900 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            {showMaaserSettings ? 'סגור הגדרות' : '⚙️ הגדר יתרת פתיחה'}
          </button>
        </div>

        {/* טופס הגדרת נקודת התחלה */}
        {showMaaserSettings && (
          <div className="bg-white p-4 rounded-lg border border-amber-200 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                יתרת חוב/זכות מוקדמת (₪)
              </label>
              <input
                type="number"
                value={initBalInput}
                onChange={(e) => setInitBalInput(Number(e.target.value))}
                className="border border-gray-300 rounded p-1.5 text-sm w-36"
                placeholder="חיובי = חוב, שלילי = זכות"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">אחוז מעשר (%)</label>
              <input
                type="number"
                value={pctInput}
                onChange={(e) => setPctInput(Number(e.target.value))}
                className="border border-gray-300 rounded p-1.5 text-sm w-24"
              />
            </div>

            <button
              onClick={handleSaveMaaserSettings}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded transition"
            >
              עדכן הגדרות
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm pt-2">
          <div className="bg-white/80 p-3 rounded-lg">
            <span className="text-xs text-gray-500 block">יתרת פתיחה קודמת</span>
            <span className="font-bold text-gray-800">₪{m.initialBalance.toFixed(2)}</span>
          </div>

          <div className="bg-white/80 p-3 rounded-lg">
            <span className="text-xs text-gray-500 block">חיוב מעשר החודש ({m.percentage}%)</span>
            <span className="font-bold text-amber-800">₪{m.monthMaaserObligation.toFixed(2)}</span>
          </div>

          <div className="bg-white/80 p-3 rounded-lg">
            <span className="text-xs text-gray-500 block">תרומות שניתנו החודש</span>
            <span className="font-bold text-emerald-700">₪{m.monthDonationsActual.toFixed(2)}</span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-amber-300">
            <span className="text-xs text-gray-600 font-bold block">יתרת מעשר עדכנית לתשלום</span>
            <span
              className={`text-lg font-black ${
                m.currentCumulativeBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {m.currentCumulativeBalance > 0
                ? `₪${m.currentCumulativeBalance.toFixed(2)} (חוב)`
                : `₪${Math.abs(m.currentCumulativeBalance).toFixed(2)} (זכות/תרומת יתר)`}
            </span>
          </div>
        </div>
      </div>

      {/* 4 כרטיסי סיכום תקציבי */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100 border-r-4 border-r-emerald-500">
          <span className="text-xs text-gray-500 font-bold uppercase">הכנסות בפועל</span>
          <p className="text-xl font-black text-emerald-600 mt-1">₪{data.totalActualIncome.toFixed(0)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-rose-100 border-r-4 border-r-rose-500">
          <span className="text-xs text-gray-500 font-bold uppercase">הוצאות שוטפות</span>
          <p className="text-xl font-black text-rose-600 mt-1">₪{data.totalActualExpenses.toFixed(0)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 border-r-4 border-r-blue-500">
          <span className="text-xs text-gray-500 font-bold uppercase">חסכונות והשקעות</span>
          <p className="text-xl font-black text-blue-600 mt-1">₪{data.totalActualSavings.toFixed(0)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <span className="text-xs text-gray-500 font-bold uppercase">עודף חופשי בפועל</span>
          <p className={`text-xl font-black mt-1 ${data.netActualFree >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₪{data.netActualFree.toFixed(0)}
          </p>
        </div>
      </div>

      {/* 1. טבלת הכנסות */}
      <BudgetSectionTable
        title="1. הכנסות"
        items={data.incomeItems || []}
        editingBudgets={editingBudgets}
        onBudgetChange={(id, val) => setEditingBudgets({ ...editingBudgets, [id]: val })}
        onSave={handleSaveBudget}
        isIncome={true}
      />

      {/* 2. טבלת הוצאות שוטפות */}
      <BudgetSectionTable
        title="2. הוצאות שוטפות"
        items={data.expenseItems || []}
        editingBudgets={editingBudgets}
        onBudgetChange={(id, val) => setEditingBudgets({ ...editingBudgets, [id]: val })}
        onSave={handleSaveBudget}
        isIncome={false}
      />

      {/* 3. טבלת חסכונות והשקעות */}
      <BudgetSectionTable
        title="3. חסכונות והשקעות יזומות"
        items={data.savingsItems || []}
        editingBudgets={editingBudgets}
        onBudgetChange={(id, val) => setEditingBudgets({ ...editingBudgets, [id]: val })}
        onSave={handleSaveBudget}
        isIncome={false}
      />

      {/* 4. טבלת תרומות ומעשרות */}
      <BudgetSectionTable
        title="4. תרומות ומעשרות"
        items={data.donationItems || []}
        editingBudgets={editingBudgets}
        onBudgetChange={(id, val) => setEditingBudgets({ ...editingBudgets, [id]: val })}
        onSave={handleSaveBudget}
        isIncome={false}
      />
    </main>
  );
}

function BudgetSectionTable({
  title,
  items,
  editingBudgets,
  onBudgetChange,
  onSave,
  isIncome,
}: {
  title: string;
  items: BudgetVsActualItem[];
  editingBudgets: { [key: number]: number };
  onBudgetChange: (catId: number, val: number) => void;
  onSave: (catId: number) => void;
  isIncome: boolean;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">קטגוריה</th>
              <th className="px-6 py-3">{isIncome ? 'יעד הכנסה (₪)' : 'תקציב/יעד (₪)'}</th>
              <th className="px-6 py-3">בפועל (₪)</th>
              <th className="px-6 py-3">{isIncome ? 'פער מהיעד' : 'יתרה / חריגה'}</th>
              <th className="px-6 py-3">פעולה</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.categoryId} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-900">{item.categoryName}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    value={editingBudgets[item.categoryId] ?? 0}
                    onChange={(e) => onBudgetChange(item.categoryId, Number(e.target.value))}
                    className="w-28 border border-gray-300 rounded p-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </td>
                <td className="px-6 py-4 font-semibold text-gray-800">₪{(item.actualAmount || 0).toFixed(2)}</td>
                <td className="px-6 py-4 font-bold text-gray-700">₪{(item.difference || 0).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onSave(item.categoryId)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-md transition"
                  >
                    שמור
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}