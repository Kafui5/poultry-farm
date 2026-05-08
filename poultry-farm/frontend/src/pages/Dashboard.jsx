import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'
import { Card, StatCard, PageHeader } from '../components/ui'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export default function Dashboard() {
  const [stats, setStats] = useState({ invoices: [], bills: [], flocks: [], lowStock: [], plData: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [invRes, billRes, flockRes, stockRes] = await Promise.all([
          api.get('/invoices'),
          api.get('/bills'),
          api.get('/flocks'),
          api.get('/inventory/low-stock'),
        ])

        // Build last 6 months P&L chart data
        const plData = []
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i)
          const from = format(startOfMonth(d), 'yyyy-MM-dd')
          const to = format(endOfMonth(d), 'yyyy-MM-dd')
          try {
            const r = await api.get(`/reports/profit-loss?date_from=${from}&date_to=${to}`)
            plData.push({ month: format(d, 'MMM'), revenue: r.data.total_revenue, expenses: r.data.total_expenses, profit: r.data.net_profit })
          } catch {
            plData.push({ month: format(d, 'MMM'), revenue: 0, expenses: 0, profit: 0 })
          }
        }

        setStats({
          invoices: invRes.data,
          bills: billRes.data,
          flocks: flockRes.data,
          lowStock: stockRes.data,
          plData,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalAR = stats.invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const totalAP = stats.bills.filter(b => b.status === 'received').reduce((s, b) => s + b.total, 0)
  const activeFlocks = stats.flocks.filter(f => f.status === 'active').length
  const totalBirds = stats.flocks.filter(f => f.status === 'active').reduce((s, f) => s + f.current_count, 0)

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Accounts Receivable" value={`$${totalAR.toLocaleString()}`} icon="💰" color="green" />
        <StatCard label="Accounts Payable" value={`$${totalAP.toLocaleString()}`} icon="📤" color="red" />
        <StatCard label="Active Flocks" value={activeFlocks} icon="🐔" color="yellow" />
        <StatCard label="Total Birds" value={totalBirds.toLocaleString()} icon="🐣" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Revenue vs Expenses (6 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.plData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={v => `$${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
              <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">⚠️ Low Stock Alerts</h2>
          {stats.lowStock.length === 0
            ? <p className="text-gray-400 text-sm">All stock levels OK</p>
            : stats.lowStock.map(p => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm">{p.name}</span>
                <span className="text-red-600 text-sm font-medium">{p.quantity_on_hand} {p.unit}</span>
              </div>
            ))
          }
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
          {stats.invoices.slice(0, 5).map(inv => (
            <div key={inv.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{inv.number}</p>
                <p className="text-xs text-gray-400">{inv.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">${inv.total?.toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Active Flocks</h2>
          {stats.flocks.filter(f => f.status === 'active').slice(0, 5).map(f => (
            <div key={f.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{f.batch_number}</p>
                <p className="text-xs text-gray-400">{f.breed || 'Unknown breed'}</p>
              </div>
              <p className="text-sm font-semibold text-green-700">{f.current_count.toLocaleString()} birds</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
