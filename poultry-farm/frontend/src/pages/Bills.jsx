import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input, Select, Badge } from '../components/ui'

const STATUS_COLORS = { draft: 'gray', received: 'blue', paid: 'green', cancelled: 'gray' }
const STATUSES = ['draft', 'received', 'paid', 'cancelled']

function emptyLine() { return { product_id: '', description: '', quantity: '', unit_price: '' } }

export default function Bills() {
  const [bills, setBills] = useState([])
  const [vendors, setVendors] = useState([])
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ number: '', vendor_id: '', date: '', due_date: '', status: 'draft', notes: '', lines: [emptyLine()] })

  const load = () => api.get('/bills').then(r => setBills(r.data))
  useEffect(() => {
    load()
    api.get('/vendors').then(r => setVendors(r.data))
    api.get('/inventory/products').then(r => setProducts(r.data))
  }, [])

  function setLine(i, k, v) {
    setForm(f => { const lines = [...f.lines]; lines[i] = { ...lines[i], [k]: v }; return { ...f, lines } })
  }

  function fillLineFromProduct(i, pid) {
    const p = products.find(x => x.id === parseInt(pid))
    if (p) setForm(f => {
      const lines = [...f.lines]
      lines[i] = { ...lines[i], product_id: pid, description: p.name, unit_price: p.cost_price }
      return { ...f, lines }
    })
    else setLine(i, 'product_id', pid)
  }

  async function save() {
    const payload = {
      ...form,
      vendor_id: parseInt(form.vendor_id),
      lines: form.lines.filter(l => l.description).map(l => ({
        product_id: l.product_id ? parseInt(l.product_id) : null,
        description: l.description,
        quantity: parseFloat(l.quantity),
        unit_price: parseFloat(l.unit_price),
      }))
    }
    await api.post('/bills', payload)
    setModal(null); load()
  }

  async function updateStatus(id, status) {
    await api.patch(`/bills/${id}/status?status=${status}`); load()
  }

  const lineTotal = form.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0)

  return (
    <div className="p-8">
      <PageHeader title="Bills" action={<Btn onClick={() => setModal(true)}>+ New Bill</Btn>} />
      <Card>
        <Table headers={['Number', 'Vendor', 'Date', 'Due', 'Total', 'Status', 'Actions']}>
          {bills.map(b => (
            <Tr key={b.id} onClick={() => setDetail(b)}>
              <Td className="font-medium">{b.number}</Td>
              <Td>{vendors.find(v => v.id === b.vendor_id)?.name || b.vendor_id}</Td>
              <Td>{b.date}</Td>
              <Td>{b.due_date || '—'}</Td>
              <Td className="font-mono">${parseFloat(b.total || 0).toLocaleString()}</Td>
              <Td><Badge label={b.status} color={STATUS_COLORS[b.status]} /></Td>
              <Td onClick={e => e.stopPropagation()}>
                <Select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {modal && (
        <Modal title="New Bill" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bill #" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
              <Select label="Vendor" value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
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
                  <th className="px-3 py-2 text-left">Cost</th>
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
              <Btn onClick={save}>Create Bill</Btn>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title={`Bill ${detail.number}`} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-sm mb-4">
            <p><span className="font-medium">Vendor:</span> {vendors.find(v => v.id === detail.vendor_id)?.name}</p>
            <p><span className="font-medium">Date:</span> {detail.date} | <span className="font-medium">Due:</span> {detail.due_date || '—'}</p>
            <p><span className="font-medium">Status:</span> <Badge label={detail.status} color={STATUS_COLORS[detail.status]} /></p>
          </div>
          <Table headers={['Description', 'Qty', 'Cost', 'Total']}>
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
