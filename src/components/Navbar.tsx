'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: '📊 תנועות וסיווג', href: '/' },
    { label: '🏷️ ניהול קטגוריות', href: '/categories' },
    { label: '⚙️ חוקי סיווג', href: '/rules' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex justify-between items-center h-16">
        
        {/* לוגו / שם האפליקציה */}
        <Link href="/" className="flex items-center gap-2 font-black text-xl text-blue-600">
          <span>SmartBudget</span>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-md">
            AI
          </span>
        </Link>

        {/* תפריט ניווט */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs sm:text-sm font-medium px-3 py-2 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}