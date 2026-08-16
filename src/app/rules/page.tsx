'use client';

import { useState } from 'react';
import RulesManager from '../../components/RulesManager';
import AIRulesManager from '../../components/AIRulesManager';

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<'regular' | 'ai'>('regular');

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">ניהול חוקי סיווג</h1>
        <p className="text-gray-600 text-sm mt-1">
          הגדר חוקים אוטומטיים רגילים או הנחיות AI לסיווג מדויק של תנועות.
        </p>
      </div>

      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('regular')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'regular'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📌 חוקים רגילים (מהיר וללא AI)
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'ai'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🤖 הנחיות AI
        </button>
      </div>

      {activeTab === 'regular' ? <RulesManager /> : <AIRulesManager />}
    </main>
  );
}