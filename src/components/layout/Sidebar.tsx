'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Import, FileText, Settings, Tags, Target } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/app/transactions", icon: Receipt },
  { name: "Import", href: "/app/import", icon: Import },
  { name: "Rules", href: "/app/rules", icon: FileText },
  { name: "Categories", href: "/app/categories", icon: Tags },
  { name: "Goals", href: "/app/goals", icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-gray-50 border-r flex flex-col p-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="mb-8 p-2">
        <h1 className="text-xl font-bold dark:text-white">Finance Tracker</h1>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                isActive
                  ? "bg-gray-200 text-gray-900 font-medium dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t pt-4 dark:border-gray-800">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Settings size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
