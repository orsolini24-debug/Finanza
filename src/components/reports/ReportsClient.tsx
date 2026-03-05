'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend, ComposedChart } from 'recharts'
import { cn } from '@/lib/utils'

interface ReportsClientProps {
  historyData: any[]
  topCategories: any[]
}

export function ReportsClient({ historyData, topCategories }: ReportsClientProps) {
  const fmt = (n: number) => `€${n.toLocaleString('it-IT')}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Grafico Entrate vs Uscite */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)] lg:col-span-2">
        <h3 className="text-xl font-display font-bold text-[var(--fg-primary)] mb-6">Entrate vs Uscite (6 mesi)</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 12, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 12, fontWeight: 600 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
                itemStyle={{ fontWeight: 700 }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar name="Entrate" dataKey="income" fill="var(--income)" radius={[6, 6, 0, 0]} barSize={24} />
              <Bar name="Uscite" dataKey="expenses" fill="var(--expense)" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Risparmio */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <h3 className="text-xl font-display font-bold text-[var(--fg-primary)] mb-6">Trend Risparmio Netto</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)' }}
              />
              <Area type="monotone" dataKey="savings" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categorie */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <h3 className="text-xl font-display font-bold text-[var(--fg-primary)] mb-6">Top 5 Categorie di Spesa</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCategories} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-primary)', fontSize: 12, fontWeight: 700 }} />
              <Tooltip 
                cursor={{ fill: 'var(--bg-elevated)', opacity: 0.4 }}
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-default)' }}
                formatter={(v: any) => fmt(v)}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
                {topCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`var(--accent)`} fillOpacity={1 - index * 0.15} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
