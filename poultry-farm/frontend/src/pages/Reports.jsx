import { useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Input, Table, Tr, Td, Badge } from '../components/ui'

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

export default function Reports() {
  const [activeReport, setActiveReport] = useState('pl')
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [asOf, setAsOf] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    setData(null)
    try {
      let res
      if (activeReport === 'pl') res = await api.get(`/reports/profit-loss?date_from=${dateFrom}&date_to=${dateTo}`)
      else if (activeReport === 'bs') res = await api.get(`/reports/balance-sheet?as_of=${asOf}`)
      else if (activeReport === 'tb') res = await api.get('/reports/trial-balance')
      else if (activeReport === 'inv') res = await api.get('/reports/inventory-valuation')
      else if (activeReport === 'ar') res = await api.get('/reports/accounts-receivable')
      else if (activeReport === 'ap') res = await api.get('/reports/accounts-payable')
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    { id: 'pl', label: 'Profit & Loss' },
    { id: 'bs', label: 'Balance Sheet' },
    { id: 'tb', label: 'Trial Balance' },
    { id: 'inv', label: 'Inventory Valuation' },
    { id: 'ar', label: 'Accounts Receivable' },
    { id: 'ap', label: 'Accounts Payable' },
  ]

  return (
    <div className="p-8">
      <PageHeader title="Reports" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <h2 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Report Type</h2>
          <div className="space-y-1">
            {reports.map(r => (
              <button key={r.id} onClick={() => { setActiveReport(r.id); setData(null) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeReport === r.id ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {(activeReport === 'pl') && <>
              <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </>}
            {activeReport === 'bs' && (
              <Input label="As of" type="date" value={asOf} onChange={e => setAsOf(e.target.value)} />
            )}
            <Btn onClick={run} disabled={loading} className="w-full justify-center">
              {loading ? 'Running...' : 'Run Report'}
            </Btn>
          </div>
        </Card>

        {/* Report Output */}
        <div className="lg:col-span-3">
          {!data && !loading && (
            <Card><p className="text-gray-400 text-center py-12">Select a report and click Run Report</p></Card>
          )}
          {loading && <Card><p className="text-gray-400 text-center py-12">Loading...</p></Card>}

          {data && activeReport === 'pl' && (
            <Card>
              <h2 className="text-xl font-bold mb-1">Profit & Loss</h2>
              <p className="text-sm text-gray-500 mb-6">{data.date_from} to {data.date_to}</p>
              <Section title="Revenue" rows={data.revenue} total={data.total_revenue} color="green" />
              <Section title="Expenses" rows={data.expenses} total={data.total_expenses} color="red" />
              <div className={`flex justify-between items-center p-4 rounded-lg mt-4 ${data.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className="font-bold text-lg">Net Profit</span>
                <span className={`font-bold text-xl ${data.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${data.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </Card>
          )}

          {data && activeReport === 'bs' && (
            <Card>
              <h2 className="text-xl font-bold mb-1">Balance Sheet</h2>
              <p className="text-sm text-gray-500 mb-6">As of {data.as_of}</p>
              <Section title="Assets" rows={data.assets} total={data.total_assets} color="blue" />
              <Section title="Liabilities" rows={data.liabilities} total={data.total_liabilities} color="red" />
              <Section title="Equity" rows={data.equity} total={data.total_equity} color="green" />
            </Card>
          )}

          {data && activeReport === 'tb' && (
            <Card>
              <h2 className="text-xl font-bold mb-6">Trial Balance</h2>
              <Table headers={['Code', 'Account', 'Type', 'Debit', 'Credit']}>
                {data.rows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-mono">{r.code}</Td>
                    <Td>{r.name}</Td>
                    <Td><Badge label={r.type} color="gray" /></Td>
                    <Td className="font-mono">{r.debit > 0 ? `$${r.debit.toFixed(2)}` : '—'}</Td>
                    <Td className="font-mono">{r.credit > 0 ? `$${r.credit.toFixed(2)}` : '—'}</Td>
                  </Tr>
                ))}
              </Table>
              <div className="flex justify-end gap-8 mt-4 pt-4 border-t font-bold">
                <span>Total Debit: ${data.total_debit.toFixed(2)}</span>
                <span>Total Credit: ${data.total_credit.toFixed(2)}</span>
              </div>
            </Card>
          )}

          {data && activeReport === 'inv' && (
            <Card>
              <h2 className="text-xl font-bold mb-6">Inventory Valuation</h2>
              <Table headers={['SKU', 'Product', 'Qty', 'Cost Price', 'Value']}>
                {data.rows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-mono text-xs">{r.sku || '—'}</Td>
                    <Td>{r.name}</Td>
                    <Td>{r.quantity}</Td>
                    <Td className="font-mono">${r.cost_price.toFixed(2)}</Td>
                    <Td className="font-mono font-medium">${r.value.toFixed(2)}</Td>
                  </Tr>
                ))}
              </Table>
              <div className="text-right mt-4 pt-4 border-t font-bold text-lg">
                Total Value: ${data.total_value.toFixed(2)}
              </div>
            </Card>
          )}

          {data && activeReport === 'ar' && (
            <Card>
              <h2 className="text-xl font-bold mb-6">Accounts Receivable</h2>
              <Table headers={['Invoice', 'Customer', 'Date', 'Due', 'Status', 'Amount']}>
                {data.rows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{r.invoice_number}</Td>
                    <Td>{r.customer}</Td>
                    <Td>{r.date}</Td>
                    <Td>{r.due_date || '—'}</Td>
                    <Td><Badge label={r.status} color={r.status === 'overdue' ? 'red' : 'blue'} /></Td>
                    <Td className="font-mono">${r.amount.toFixed(2)}</Td>
                  </Tr>
                ))}
              </Table>
              <div className="text-right mt-4 pt-4 border-t font-bold">Total: ${data.total.toFixed(2)}</div>
            </Card>
          )}

          {data && activeReport === 'ap' && (
            <Card>
              <h2 className="text-xl font-bold mb-6">Accounts Payable</h2>
              <Table headers={['Bill', 'Vendor', 'Date', 'Due', 'Status', 'Amount']}>
                {data.rows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{r.bill_number}</Td>
                    <Td>{r.vendor}</Td>
                    <Td>{r.date}</Td>
                    <Td>{r.due_date || '—'}</Td>
                    <Td><Badge label={r.status} color="blue" /></Td>
                    <Td className="font-mono">${r.amount.toFixed(2)}</Td>
                  </Tr>
                ))}
              </Table>
              <div className="text-right mt-4 pt-4 border-t font-bold">Total: ${data.total.toFixed(2)}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, rows, total, color }) {
  const colors = { green: 'text-green-700', red: 'text-red-700', blue: 'text-blue-700' }
  return (
    <div className="mb-6">
      <h3 className={`font-semibold text-lg mb-2 ${colors[color]}`}>{title}</h3>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between py-1 border-b last:border-0 text-sm">
          <span className="text-gray-600">{r.code} — {r.name}</span>
          <span className="font-mono">${r.amount.toFixed(2)}</span>
        </div>
      ))}
      <div className={`flex justify-between py-2 font-semibold ${colors[color]}`}>
        <span>Total {title}</span>
        <span className="font-mono">${total.toFixed(2)}</span>
      </div>
    </div>
  )
}
