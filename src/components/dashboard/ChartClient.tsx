'use client'

import { useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, LineChart, Line, ReferenceLine, Legend, ComposedChart
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartData {
  name: string
  amount: number
  daily?: number
}

interface MonthlyData {
  month: string
  income: number
  expenses: number
  net: number
}

interface ChartCarouselProps {
  chartData: ChartData[] // Cash Flow del mese
  categoryData: ChartData[] // Spese per categoria
  monthlyData: MonthlyData[] // 6 mesi
  currentMonthLabel: string
}

export function ChartCarousel({ chartData, categoryData, monthlyData, currentMonthLabel }: ChartCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isChanging, setIsChanging] = useState(false)

  const handleNext = () => {
    setIsChanging(true)
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % 4)
      setIsChanging(false)
    }, 200)
  }

  const handlePrev = () => {
    setIsChanging(true)
    setTimeout(() => {
      setActiveIndex((prev) => (prev - 1 + 4) % 4)
      setIsChanging(false)
    }, 200)
  }

  const fmt = (n: number) => `€${n.toLocaleString('it-IT')}`

  const CHARTS = [
    {
      id: 'cashflow',
      title: '💧 Cash Flow del Mese',
      subtitle: 'Flusso netto cumulativo — entrate meno uscite',
      component: (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartData[chartData.length-1]?.amount >= 0 ? 'var(--income)' : 'var(--expense)'} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartData[chartData.length-1]?.amount >= 0 ? 'var(--income)' : 'var(--expense)'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} tickFormatter={(v) => `€${v}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
              formatter={(v: any) => [fmt(v), "Netto Cumulativo"]}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke={chartData[chartData.length-1]?.amount >= 0 ? 'var(--income)' : 'var(--expense)'} 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorCash)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'compare',
      title: '📊 Entrate vs Uscite',
      subtitle: 'Confronto mensile ultimi 6 mesi',
      component: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)' }}
              formatter={(v: any) => fmt(v)}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Bar name="Entrate" dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar name="Uscite" dataKey="expenses" fill="var(--expense)" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'categories',
      title: '🍩 Spese per Categoria',
      subtitle: 'Distribuzione uscite del mese',
      component: (
        <div className="flex flex-col md:flex-row items-center h-full">
          <div className="w-full md:w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f97066', '#fb923c', '#fbbf24', '#f43f5e', '#e879f9', '#a78bfa', '#94a3b8'][index % 7]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px' }} formatter={(v: any) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-2 px-4 overflow-y-auto max-h-[200px] custom-scrollbar">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f97066', '#fb923c', '#fbbf24', '#f43f5e', '#e879f9', '#a78bfa', '#94a3b8'][i % 7] }} />
                  <span className="text-[11px] font-bold text-[var(--fg-primary)] truncate max-w-[100px]">{cat.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[var(--fg-muted)]">{fmt(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'savings',
      title: '📈 Trend Risparmio',
      subtitle: 'Risparmio netto mensile ultimi 6 mesi',
      component: (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)' }}
              formatter={(v: any) => [fmt(v), "Risparmio Netto"]}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="net" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
          </AreaChart>
        </ResponsiveContainer>
      )
    }
  ]

  return (
    <div className="glass p-4 sm:p-6 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-[var(--border-subtle)] h-full flex flex-col min-h-[300px] sm:min-h-[380px] md:min-h-[450px]">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div className={cn("transition-all duration-300", isChanging ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0")}>
          <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-[var(--fg-primary)]">{CHARTS[activeIndex].title}</h2>
          <p className="text-[10px] sm:text-xs text-[var(--fg-muted)] font-medium mt-1 hidden sm:block">{CHARTS[activeIndex].subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full text-[10px] font-black text-[var(--fg-muted)] uppercase tracking-widest">
            {activeIndex + 1} / 4
          </div>
        </div>
      </div>

      <div className={cn("flex-1 transition-all duration-300", isChanging ? "opacity-0 scale-[0.98] blur-sm" : "opacity-100 scale-100 blur-0")}>
        {CHARTS[activeIndex].component}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 md:mt-8">
        <button onClick={handlePrev} className="p-2.5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all active:scale-90">
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                activeIndex === i ? "w-8 bg-[var(--accent)] shadow-[0_0_10px_var(--glow-accent)]" : "w-1.5 bg-[var(--border-strong)]"
              )} 
            />
          ))}
        </div>

        <button onClick={handleNext} className="p-2.5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all active:scale-90">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

// Mantengo gli export originali per compatibilità se usati altrove
export function OverviewChart({ data }: { data: ChartData[] }) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }} tickFormatter={(value) => `€${value}`} />
          <Tooltip 
            cursor={{ fill: 'var(--bg-elevated)', opacity: 0.4 }}
            contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            itemStyle={{ color: 'var(--accent)', fontWeight: 700 }}
            labelStyle={{ color: 'var(--fg-primary)', marginBottom: '4px', fontWeight: 800 }}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.amount >= 0 ? 'var(--income)' : 'var(--expense)'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoriesPieChart({ data }: { data: ChartData[] }) {
  const COLORS = ['#f97066', '#fb923c', '#fbbf24', '#f43f5e', '#e879f9', '#a78bfa', '#38bdf8'];
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="amount">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-default)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
