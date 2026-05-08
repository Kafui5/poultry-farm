import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input, Select, Badge } from '../components/ui'

const STATUS_COLORS = { draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', cancelled: 'gray' }
const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

function emptyLine() { return { product_id: '', description: '', quantity: '', unit_price: '' } }

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ number: '', customer_id: '', date: '', due_date: '', status: 'draft', notes: '', lines: [emptyLine()] })

  const load = () => api.get('/invoices').then(r => setInvoices(r.data))
  useEffect(() => {
    load()
    api.get('/customers').then(r => setCustomers(r.data))
    api.get('/inventory/products').then(r => setProducts(r.data))
  }, [])

  function setLine(i, k, v) {
    setForm(f => { const lines = [...f.lines]; lines[i] = { ...lines[i], [k]: v }; return { ...f, lines } })
  }

  function fillLineFromProduct(i, pid) {
    const p = products.find(x => x.id === parseInt(pid))
    if (p) setForm(f => {
      const lines = [...f.lines]
      lines[i] = { ...lines[i], product_id: pid, description: p.name, unit_price: p.sale_price }
      return { ...f, lines }
    })
    else setLine(i, 'product_id', pid)
  }

  async function save() {
    const payload = {
      ...form,
      customer_id: parseInt(form.customer_id),
      lines: form.lines.filter(l => l.description).map(l => ({
        product_id: l.product_id ? parseInt(l.product_id) : null,
        description: l.description,
        quantity: parseFloat(l.quantity),
        unit_price: parseFloat(l.unit_price),
      }))
    }
    await api.post('/invoices', payload)
    setModal(null); load()
  }

  async function updateStatus(id, status) {
    await api.patch(`/invoices/${id}/status?status=${status}`); load()
  }

  const lineTotal = form.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0)

  return (
    <div className="p-8">
      <PageHeader title="Invoices" action={<Btn onClick={() => setModal(true)}>+ New Invoice</Btn>} />
      <Card>
        <Table headers={['Number', 'Customer', 'Date', 'Due', 'Total', 'Status', 'Actions']}>
          {invoices.map(inv => (
            <Tr key={inv.id} onClick={() => setDetail(inv)}>
              <Td className="font-medium">{inv.number}</Td>
              <Td>{customers.find(c => c.id === inv.customer_id)?.name || inv.customer_id}</Td>
              <Td>{inv.date}</Td>
              <Td>{inv.due_date || '—'}</Td>
              <Td className="font-mono">${parseFloat(inv.total || 0).toLocaleString()}</Td>
              <Td><Badge label={inv.status} color={STATUS_COLORS[inv.status]} /></Td>
              <Td onClick={e => e.stopPropagation()}>
                <Select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)} className="text-xs">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {modal && (
        <Modal title="New Invoice" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Invoice #" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
              <Select label="Customer" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="px-3 py-2 text-left">Total</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {form.lines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">
                        <select className="w-full border rounded px-2 py-1 text-xs" value={l.product_id} onChange={e => fillLineFromProduct(i, e.target.value)}>
                          <option value="">None</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1"><input className="w-full border rounded px-2 py-1 text-sm" value={l.description} onChange={e => setLine(i, 'description', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" className="w-20 border rounded px-2 py-1 text-sm" value={l.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" className="w-24 border rounded px-2 py-1 text-sm" value={l.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)} /></td>
                      <td className="px-2 py-1 text-sm font-mono">${((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0)).toFixed(2)}</td>
                      <td className="px-2 py-1"><button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))} className="text-red-400">✕</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr><td colSpan={4} className="px-3 py-2 text-sm font-medium text-right">Total</td>
                    <td className="px-3 py-2 text-sm font-mono font-bold">${lineTotal.toFixed(2)}</td><td></td></tr>
                </tfoot>
              </table>
            </div>
            <Btn variant="secondary" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))}>+ Add Line</Btn>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Create Invoice</Btn>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title={`Invoice ${detail.number}`} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-sm mb-4">
            <p><span className="font-medium">Customer:</span> {customers.find(c => c.id === detail.customer_id)?.name}</p>
            <p><span className="font-medium">Date:</span> {detail.date} | <span className="font-medium">Due:</span> {detail.due_date || '—'}</p>
            <p><span className="font-medium">Status:</span> <Badge label={detail.status} color={STATUS_COLORS[detail.status]} /></p>
          </div>
          <Table headers={['Description', 'Qty', 'Price', 'Total']}>
            {detail.lines.map(l => (
              <Tr key={l.id}>
                <Td>{l.description}</Td>
                <Td>{l.quantity}</Td>
                <Td>${parseFloat(l.unit_price).toFixed(2)}</Td>
                <Td className="font-mono">${(parseFloat(l.quantity) * parseFloat(l.unit_price)).toFixed(2)}</Td>
              </Tr>
            ))}
          </Table>
          <div className="text-right mt-3 font-bold">Total: ${parseFloat(detail.total || 0).toFixed(2)}</div>
        </Modal>
      )}
    </div>
  )
}
