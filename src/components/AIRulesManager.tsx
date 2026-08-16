'use client';

import { useState, useEffect } from 'react';
import {
  getAIRules,
  createAIRuleAction,
  deleteAIRuleAction,
  AIRuleItem,
} from '../app/actions/ai-rules-actions';

export default function AIRulesManager() {
  const [rules, setRules] = useState<AIRuleItem[]>([]);
  const [instructionText, setInstructionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = async () => {
    try {
      const data = await getAIRules();
      setRules(data);
    } catch (err) {
      setError('שגיאה בטעינת חוקי ה-AI');
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createAIRuleAction(instructionText);
      setInstructionText('');
      await loadRules();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת החוק');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק חוק זה?')) return;

    try {
      await deleteAIRuleAction(id);
      await loadRules();
    } catch (err: any) {
      setError('שגיאה במחיקת החוק');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-lg font-bold mb-3 text-gray-800">הוספת הנחיה חדשה ל-AI</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הוראה חופשית (Prompt Instruction)
            </label>
            <input
              type="text"
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              placeholder='לדוגמה: "סווג תמיד תנועות המכילות סופר-פארם תחת קניות וביגוד"'
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'שומר...' : 'הוסף הנחיית AI'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">הנחיות AI פעילות ({rules.length})</h2>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            אין הנחיות AI מוגדרות כרגע. ה-AI ישתמש בהנחיות ברירת המחדל.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <li key={rule.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <p className="text-sm text-gray-800 font-medium">{rule.instructionText}</p>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded"
                >
                  מחק
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}