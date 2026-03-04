'use client'

import { useState } from 'react'
import { Plus, Play, Pause, Trash2, Edit2, Zap } from 'lucide-react'

// Mock rules for UI development
const mockRules = [
  { id: '1', name: 'Esselunga Grocery', contains: 'esselunga', category: 'Food', priority: 10, isEnabled: true },
  { id: '2', name: 'Rent Payment', contains: 'rent', category: 'Housing', priority: 1, isEnabled: true },
  { id: '3', name: 'Amazon Shopping', contains: 'amazon', category: 'Shopping', priority: 20, isEnabled: false },
]

export default function RulesPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Categorization Rules</h1>
          <p className="text-gray-500 text-sm">Automate your transaction classification using keyword matching.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Rule</span>
        </button>
      </div>

      <div className="grid gap-4">
        {mockRules.map((rule) => (
          <div 
            key={rule.id} 
            className={`p-6 border rounded-xl shadow-sm bg-white dark:bg-gray-950 dark:border-gray-800 flex items-center justify-between ${!rule.isEnabled ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${rule.isEnabled ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{rule.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                    If description contains: <strong>"{rule.contains}"</strong>
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded">
                    Set category: <strong>{rule.category}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="mr-4 text-right">
                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Priority</span>
                <span className="font-mono font-bold text-gray-600">{rule.priority}</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-blue-600 transition" title={rule.isEnabled ? "Pause" : "Activate"}>
                {rule.isEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
