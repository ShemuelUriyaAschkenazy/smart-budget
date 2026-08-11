'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import TransactionsTable from '@/components/TransactionsTable';
import { TransactionRow } from '@/app/actions/parse-file';

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Smart AI Budget Tracker</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload Excel bank/credit statements & classify transactions automatically using Gemini Flash.
        </p>
      </header>

      <FileUpload onDataParsed={setTransactions} />
      <TransactionsTable transactions={transactions} />
    </main>
  );
}