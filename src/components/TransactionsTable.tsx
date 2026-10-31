"use client";

import { useState } from "react";
import {
  TransactionRow,
  toggleTransactionMaaserAction,
} from "../app/actions/parse-file";
import { CategoryItem } from "../app/actions/categories-actions";
import { createRuleAction } from "../app/actions/rules-actions";

interface TableProps {
  transactions: TransactionRow[];
  categories: CategoryItem[];
  onDeleteRow: (id: string) => void;
  onClearAll: () => void;
  onCategoryChange: (id: string, newCategory: string) => Promise<void>;
}

export default function TransactionsTable({
  transactions,
  categories,
  onDeleteRow,
  onClearAll,
  onCategoryChange,
}: TableProps) {
  const [pendingRule, setPendingRule] = useState<{
    description: string;
    categoryName: string;
    categoryId: number;
  } | null>(null);

  if (!transactions || transactions.length === 0) return null;

  const handleSelectChange = async (
    item: TransactionRow,
    newCatName: string,
  ) => {
    if (!item.id || item.category === newCatName) return;

    await onCategoryChange(item.id, newCatName);

    const isSuppressed =
      sessionStorage.getItem("suppressRulePrompt") === "true";
    if (isSuppressed) return;

    const matchedCat = categories.find((c) => c.name === newCatName);
    if (matchedCat) {
      setPendingRule({
        description: item.description,
        categoryName: newCatName,
        categoryId: Number(matchedCat.id),
      });
    }
  };

  // מעבר מחזורי: לפי קטגוריה (null) -> שינוי ידני להפך -> החזרה לקטגוריה
  const handleToggleMaaser = async (
    item: TransactionRow,
    currentEffective: boolean,
    isOverridden: boolean,
  ) => {
    if (!item.id) return;

    let newStatus: boolean | null;
    let confirmMsg: string;

    if (!isOverridden) {
      newStatus = !currentEffective;
      const actionText = newStatus ? "להוסיף לחישוב" : "להסיר מחישוב";
      confirmMsg = `האם לקבוע עריכה ידנית: ${actionText} המעשר עבור:\n"${item.description}"?`;
    } else {
      newStatus = null; // איפוס בחזרה לירושה מהקטגוריה
      confirmMsg = `האם לאפס את התנועה "${item.description}" בחזרה לברירת המחדל של הקטגוריה?`;
    }

    if (!confirm(confirmMsg)) return;

    await toggleTransactionMaaserAction(item.id, newStatus);
    item.countInMaaser = newStatus;
  };

  const handleConfirmRule = async () => {
    if (!pendingRule) return;

    try {
      await createRuleAction(pendingRule.description, pendingRule.categoryId);
      alert(
        `נוצר חוק חדש עבור "${pendingRule.description}" ⬅ ${pendingRule.categoryName}`,
      );
    } catch (err: any) {
      alert(err.message || "שגיאה ביצירת החוק");
    } finally {
      setPendingRule(null);
    }
  };

  const handleCloseModal = (checkedDontAsk: boolean) => {
    if (checkedDontAsk) {
      sessionStorage.getItem("suppressRulePrompt") &&
        sessionStorage.setItem("suppressRulePrompt", "true");
    }
    setPendingRule(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden relative">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">2. תנועות מסווגות</h2>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
            {transactions.length} תנועות
          </span>
        </div>

        <button
          onClick={onClearAll}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-lg transition"
        >
          מחק את כל ההעלאה האחרונה
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">תאריך</th>
              <th className="px-6 py-3">תיאור</th>
              <th className="px-6 py-3">סכום</th>
              <th className="px-6 py-3">מקור</th>
              <th className="px-6 py-3">קטגוריה</th>
              <th className="px-6 py-3 text-center">מעשר</th>
              <th className="px-6 py-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => {
              const isUncategorized =
                !item.category || item.category === "ללא קטגוריה";
              const matchedCat = categories.find(
                (c) => c.name === item.category,
              );
              const showMaaserToggle =
                matchedCat?.type === "income" ||
                matchedCat?.type === "donations";

              // זיהוי האם התנועה נערכה ידנית
              const isOverridden =
                item.countInMaaser !== null && item.countInMaaser !== undefined;
              const isCounted = isOverridden
                ? item.countInMaaser
                : (matchedCat?.countInMaaserDefault ?? false);

              return (
                <tr
                  key={item.id}
                  className={`border-b transition ${
                    isUncategorized
                      ? "bg-amber-50/40 hover:bg-amber-100/50"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="px-6 py-4">{item.description}</td>
                  <td
                    dir="ltr"
                    className={`px-6 py-4 font-semibold text-right ${
                      Number(item.amount) < 0
                        ? "text-gray-800"
                        : "text-emerald-600"
                    }`}
                  >
                    {Number(item.amount) < 0
                      ? `-₪${Math.abs(Number(item.amount)).toFixed(2)}`
                      : `₪${Number(item.amount).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4">
                    {item.accountName || "חשבון כללי"}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={item.category || "ללא קטגוריה"}
                      onChange={(e) => handleSelectChange(item, e.target.value)}
                      className={`border rounded-lg p-1.5 text-xs font-semibold focus:outline-none focus:ring-2 transition cursor-pointer ${
                        isUncategorized
                          ? "bg-amber-100 text-amber-800 border-amber-300 focus:ring-amber-400"
                          : "bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400"
                      }`}
                    >
                      {categories.map((c) => (
                        <option
                          key={c.id}
                          value={c.name}
                          className="bg-white text-gray-800 font-normal"
                        >
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {showMaaserToggle ? (
                      <button
                        onClick={() =>
                          handleToggleMaaser(item, !!isCounted, isOverridden)
                        }
                        className={`text-xs font-bold px-2.5 py-1 rounded transition border inline-flex items-center gap-1 ${
                          isCounted
                            ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                            : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                        }`}
                        title={
                          isOverridden
                            ? "נערך ידנית! לחץ שוב כדי לאפס לברירת המחדל של הקטגוריה"
                            : "מחושב לפי הקטגוריה. לחץ כדי לערוך ידנית"
                        }
                      >
                        {isOverridden && (
                          <span className="text-[10px]">✍️</span>
                        )}
                        <span>{isCounted ? "🪙 מחושב" : "לא מחושב"}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => item.id && onDeleteRow(item.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      title="מחק שורה"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">
              האם ליצור חוק קבוע?
            </h3>
            <p className="text-sm text-gray-600">
              הבחנת בשיוך התנועה <strong>"{pendingRule.description}"</strong>{" "}
              לקטגוריה <strong>"{pendingRule.categoryName}"</strong>.
            </p>
            <p className="text-xs text-gray-500">
              יצירת חוק תבטיח שכל תנועה עתידית עם תיאור זה תסווג אוטומטית
              לקטגוריה זו.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t">
              <input
                type="checkbox"
                id="suppressPrompt"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                onChange={(e) =>
                  ((window as any)._tempSuppress = e.target.checked)
                }
              />
              <label
                htmlFor="suppressPrompt"
                className="text-xs text-gray-600 cursor-pointer"
              >
                אל תשאל אותי שוב (תקף עד לרענון העמוד)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() =>
                  handleCloseModal(!!(window as any)._tempSuppress)
                }
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                לא תודה
              </button>
              <button
                onClick={() => {
                  const suppress = !!(window as any)._tempSuppress;
                  if (suppress) {
                    sessionStorage.setItem("suppressRulePrompt", "true");
                  }
                  handleConfirmRule();
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                צור חוק קבוע
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
