'use client';

import { useState, useEffect } from 'react';
import {
  getReconciliationData,
  createMatchAction,
  removeMatchAction,
  ReconciliationOverview,
} from '../actions/reconciliation-actions';

export default function ReconciliationPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [data, setData] = useState<ReconciliationOverview | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const overview = await getReconciliationData(selectedMonth);
      setData(overview);
    } catch (err) {
      console.error('שגיאה בטעינת נתוני התאמה:', err);
    } finally {
      setSelectedBankId(null);
      setSelectedCreditId(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const handleMatch = async () => {
    if (!selectedBankId || !selectedCreditId) return;
    await createMatchAction(selectedBankId, selectedCreditId, selectedMonth);
    await loadData();
  };

  const handleUnmatch = async (bankId: string, creditId: string) => {
    await removeMatchAction(bankId, creditId);
    await loadData();
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-gray-500 text-sm">טוען נתוני התאמה...</div>;
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🔗 התאמת אשראי ובנקים</h1>
          <p className="text-gray-500 text-sm mt-1">
            בקרת כיסוי פיננסית: קשר בין חיובי הבנק בחודש הנבחר לבין פירוט עסקאות האשראי (הכולל גם את החודש הקודם).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">חודש חיוב בבנק:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm focus:outline-none bg-white font-semibold"
          />
        </div>
      </header>

      {/* סרגל סיכום סנכרון */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase block">חיובי בנק ממתינים להתאמה</span>
            <span className="text-xl font-black text-amber-600">₪{data.unmatchedBankTotal.toFixed(2)}</span>
          </div>
          <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
            {data.bankCharges.filter((b) => !b.isMatched).length} תנועות
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase block">עסקאות אשראי ממתינות (חודש זה + קודם)</span>
            <span className="text-xl font-black text-blue-600">₪{data.unmatchedCreditTotal.toFixed(2)}</span>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
            {data.creditDetails.filter((c) => !c.isMatched).length} תנועות
          </span>
        </div>
      </div>

      {/* כפתור פעולה מהירה לשיוך */}
      {selectedBankId && selectedCreditId && (
        <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-bounce">
          <span className="text-sm font-bold">נבחרו 2 תנועות לקישור. האם לאשר את ההתאמה?</span>
          <button
            onClick={handleMatch}
            className="bg-white text-blue-700 font-black px-6 py-2 rounded-lg hover:bg-blue-50 transition text-sm"
          >
            קשר תנועות אלו 🔗
          </button>
        </div>
      )}

      {/* לוח ההתאמות צד-מול-צד (Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* עמודה ימנית: חיובי בנק */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden space-y-2">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center">
            <div>
              <span className="block">1. חיובי אשראי שירדו בבנק</span>
              <span className="text-xs text-gray-400 font-normal">חודש {selectedMonth} בלבד</span>
            </div>
            <span className="text-xs text-gray-500 font-normal">לחץ לבחירה לשיוך</span>
          </div>

          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {data.bankCharges.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                אין חיובי אשראי שנרשמו בבנק בחודש {selectedMonth}
              </p>
            ) : (
              data.bankCharges.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.isMatched && setSelectedBankId(selectedBankId === item.id ? null : item.id)}
                  className={`p-3 rounded-lg border text-sm transition flex justify-between items-center cursor-pointer ${
                    item.isMatched
                      ? 'bg-emerald-50/60 border-emerald-200 cursor-default'
                      : selectedBankId === item.id
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-bold text-gray-800">{item.description}</p>
                    <p className="text-xs text-gray-400">{item.date} • {item.source}</p>
                  </div>

                  <div className="text-left flex items-center gap-3">
                    <span className="font-black text-gray-900 dir-ltr">₪{item.amount.toFixed(2)}</span>
                    {item.isMatched ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.matchedToId) handleUnmatch(item.id, item.matchedToId);
                        }}
                        className="text-xs text-red-500 hover:underline font-bold"
                        title="בטל קישור"
                      >
                        🔗 הסר
                      </button>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                        ⏳ ממתין
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* עמודה שמאלית: עסקאות אשראי */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden space-y-2">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center">
            <div>
              <span className="block">2. פירוט עסקאות אשראי שהועלו</span>
              <span className="text-xs text-gray-400 font-normal">הצגת עסקאות מחודש זה והחודש שקדם לו</span>
            </div>
            <span className="text-xs text-gray-500 font-normal">לחץ לבחירה לשיוך</span>
          </div>

          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {data.creditDetails.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                לא נמצאו עסקאות אשראי עבור חודש זה או החודש שקדם לו
              </p>
            ) : (
              data.creditDetails.map((item) => {
                const isPrevMonth = item.description.includes('(חודש קודם)');
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.isMatched && setSelectedCreditId(selectedCreditId === item.id ? null : item.id)}
                    className={`p-3 rounded-lg border text-sm transition flex justify-between items-center cursor-pointer ${
                      item.isMatched
                        ? 'bg-emerald-50/60 border-emerald-200 cursor-default'
                        : selectedCreditId === item.id
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{item.description}</p>
                        {isPrevMonth && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">
                            חודש קודם
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{item.date} • {item.source}</p>
                    </div>

                    <div className="text-left flex items-center gap-3">
                      <span className="font-black text-gray-900 dir-ltr">₪{item.amount.toFixed(2)}</span>
                      {item.isMatched ? (
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          🔗 מקושר
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                          ⏳ ממתין
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}