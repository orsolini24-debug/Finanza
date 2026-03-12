'use client'

import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
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

const fmt = (n: number) => `€${n.toLocaleString('it-IT')}`
const fmtShort = (n: number) => `€${n >= 1000 ? `${(n/1000).toFixed(0)}k` : n.toFixed(0)}`

const CHART_INFO = [
  { id: 'cashflow', title: '💧 Cash Flow del Mese', subtitle: 'Flusso netto cumulativo — entrate meno uscite' },
  { id: 'compare', title: '📊 Entrate vs Uscite', subtitle: 'Confronto mensile ultimi 6 mesi' },
  { id: 'categories', title: '🍩 Spese per Categoria', subtitle: 'Distribuzione uscite del mese' },
  { id: 'savings', title: '📈 Trend Risparmio', subtitle: 'Risparmio netto mensile ultimi 6 mesi' }
]

const COLORS = ['#f97066', '#fb923c', '#fbbf24', '#f43f5e', '#e879f9', '#a78bfa', '#94a3b8']

export function ChartCarousel({ chartData, categoryData, monthlyData }: ChartCarouselProps) {
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

  const renderActiveChart = () => {
    switch (activeIndex) {
      case 0: {
        const isPositive = (chartData[chartData.length - 1]?.amount || 0) >= 0
        const color = isPositive ? 'var(--income)' : 'var(--expense)'
        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            textStyle: { color: 'var(--fg-primary)' },
            formatter: (params: any[]) => `${params[0].name}<br/>Netto Cumulativo: ${fmt(params[0].value)}`
          },
          grid: { left: '3%', right: '3%', bottom: '5%', top: '10%', containLabel: true },
          xAxis: { type: 'category', data: chartData.map(d => d.name), axisLabel: { color: 'var(--fg-muted)', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
          yAxis: { type: 'value', axisLabel: { color: 'var(--fg-muted)', fontSize: 10, formatter: fmtShort }, splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } } },
          series: [{
            type: 'line', smooth: true,
            data: chartData.map(d => d.amount),
            lineStyle: { color, width: 3 },
            symbol: 'circle', symbolSize: 6,
            itemStyle: { color },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `color-mix(in srgb, ${color} 30%, transparent)` }, { offset: 1, color: 'transparent' }] } }
          }]
        }
        return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      }
      case 1: {
        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            textStyle: { color: 'var(--fg-primary)' },
            formatter: (params: any[]) => params.map(p => `${p.seriesName}: ${fmt(p.value)}`).join('<br/>')
          },
          legend: { top: 0, right: 0, icon: 'circle', textStyle: { color: 'var(--fg-muted)' } },
          grid: { left: '3%', right: '3%', bottom: '5%', top: '15%', containLabel: true },
          xAxis: { type: 'category', data: monthlyData.map(d => d.month), axisLabel: { color: 'var(--fg-muted)', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
          yAxis: { type: 'value', axisLabel: { color: 'var(--fg-muted)', fontSize: 10, formatter: fmtShort }, splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } } },
          series: [
            { name: 'Entrate', type: 'bar', data: monthlyData.map(d => d.income), itemStyle: { color: 'var(--income)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 30 },
            { name: 'Uscite', type: 'bar', data: monthlyData.map(d => d.expenses), itemStyle: { color: 'var(--expense)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 30 }
          ]
        }
        return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      }
      case 2: {
        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            textStyle: { color: 'var(--fg-primary)' },
            formatter: '{b}: {c}'
          },
          series: [{
            type: 'pie',
            radius: ['50%', '80%'],
            center: ['50%', '50%'],
            itemStyle: { borderRadius: 4, borderColor: 'var(--bg-surface)', borderWidth: 2 },
            label: { show: false },
            data: categoryData.map((d, i) => ({ value: d.amount, name: d.name, itemStyle: { color: COLORS[i % COLORS.length] } }))
          }]
        }
        return (
          <div className="flex flex-col md:flex-row items-center h-full">
            <div className="w-full md:w-1/2 h-full min-h-[250px]">
              <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
            </div>
            <div className="w-full md:w-1/2 space-y-2 px-4 overflow-y-auto max-h-[200px] custom-scrollbar">
              {categoryData.map((cat: any, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[11px] font-bold text-[var(--fg-primary)] truncate max-w-[100px]">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[var(--fg-muted)]">{fmt(cat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case 3: {
        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            textStyle: { color: 'var(--fg-primary)' },
            formatter: (params: any[]) => `${params[0].name}<br/>Risparmio Netto: ${fmt(params[0].value)}`
          },
          grid: { left: '3%', right: '3%', bottom: '5%', top: '10%', containLabel: true },
          xAxis: { type: 'category', data: monthlyData.map(d => d.month), axisLabel: { color: 'var(--fg-muted)', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
          yAxis: { type: 'value', axisLabel: { color: 'var(--fg-muted)', fontSize: 10, formatter: fmtShort }, splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } } },
          series: [{
            type: 'line', smooth: true,
            data: monthlyData.map(d => d.net),
            lineStyle: { color: 'var(--accent)', width: 3 },
            symbol: 'circle', symbolSize: 6,
            itemStyle: { color: 'var(--accent)' },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'color-mix(in srgb, var(--accent) 20%, transparent)' }, { offset: 1, color: 'transparent' }] } },
            markLine: { data: [{ yAxis: 0, lineStyle: { color: 'var(--border-strong)', type: 'dashed' }, label: { show: false }, symbol: 'none' }] }
          }]
        }
        return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      }
      default:
        return null
    }
  }

  return (
    <div className="glass p-4 sm:p-6 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-[var(--border-subtle)] h-full flex flex-col min-h-[300px] sm:min-h-[380px] md:min-h-[450px]">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div className={cn("transition-all duration-300", isChanging ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0")}>
          <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-[var(--fg-primary)]">{CHART_INFO[activeIndex].title}</h2>
          <p className="text-[10px] sm:text-xs text-[var(--fg-muted)] font-medium mt-1 hidden sm:block">{CHART_INFO[activeIndex].subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full text-[10px] font-black text-[var(--fg-muted)] uppercase tracking-widest">
            {activeIndex + 1} / 4
          </div>
        </div>
      </div>

      <div className={cn("flex-1 transition-all duration-300", isChanging ? "opacity-0 scale-[0.98] blur-sm" : "opacity-100 scale-100 blur-0")}>
        {renderActiveChart()}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 md:mt-8">
        <button onClick={handlePrev} className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <button 
              key={i} 
              onClick={() => setActiveIndex(i)}
              className="p-2 group"
              aria-label={`Vai al grafico ${i + 1}`}
            >
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  activeIndex === i ? "w-8 bg-[var(--accent)] shadow-[0_0_10px_var(--glow-accent)]" : "w-1.5 bg-[var(--border-strong)] group-hover:bg-[var(--fg-muted)]"
                )} 
              />
            </button>
          ))}
        </div>

        <button onClick={handleNext} className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

export function OverviewChart({ data }: { data: ChartData[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--fg-primary)' },
      formatter: (params: any[]) => `${params[0].name}<br/>${fmt(params[0].value)}`
    },
    grid: { left: '3%', right: '3%', bottom: '5%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: 'var(--fg-muted)', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: 'var(--fg-muted)', fontSize: 10, formatter: fmtShort }, splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } } },
    series: [{
      type: 'bar',
      data: data.map(d => ({ value: d.amount, itemStyle: { color: d.amount >= 0 ? 'var(--income)' : 'var(--expense)' } })),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
      barMaxWidth: 32
    }]
  }
  return (
    <div className="h-[300px] w-full mt-4">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
    </div>
  )
}

export function CategoriesPieChart({ data }: { data: ChartData[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--fg-primary)' },
      formatter: '{b}: {c}'
    },
    series: [{
      type: 'pie',
      radius: ['50%', '80%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 4, borderColor: 'var(--bg-surface)', borderWidth: 2 },
      label: { show: false },
      data: data.map((d, i) => ({ value: d.amount, name: d.name, itemStyle: { color: COLORS[i % COLORS.length] } }))
    }]
  }
  return (
    <div className="h-[240px] w-full">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
    </div>
  )
}