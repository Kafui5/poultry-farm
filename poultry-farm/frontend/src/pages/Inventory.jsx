import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input, Select, Badge } from '../components/ui'

const CATEGORIES = ['live_birds', 'eggs', 'feed', 'medication', 'equipment', 'other']
const CAT_COLORS = { live_birds: 'yellow', eggs: 'blue', feed: 'green', medication: 'red', equipment: 'gray', other: 'gray' }

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const [adjModal, setAdjModal] = useState(null)
  const [form, setForm] = useState({ sku: '', name: '', category: 'other', unit: '', cost_price: '', sale_price: '', reorder_level: '' })
  const [adjForm, setAdjForm] = useState({ product_id: '', date: '', quantity: '', reason: '' })

  const load = () => api.get('/inventory/products').then(r => setProducts(r.data))
  useEffect(() => { load() }, [])

  function openCreate() { setForm({ sku: '', name: '', category: 'other', unit: '', cost_price: '', sale_price: '', reorder_level: '' }); setModal('create') }
  function openEdit(p) { setForm({ sku: p.sku || '', name: p.name, category: p.category, unit: p.unit || '', cost_price: p.cost_price, sale_price: p.sale_price, reorder_level: p.reorder_level }); setModal(p) }

  async function saveProduct() {
    const payload = { ...form, cost_price: parseFloat(form.cost_price) || 0, sale_price: parseFloat(form.sale_price) || 0, reorder_level: parseFloat(form.reorder_level) || 0 }
    if (modal === 'create') await api.post('/inventory/products', payload)
    else await api.put(`/inventory/products/${modal.id}`, payload)
    setModal(null); load()
  }

  async function saveAdj() {
    await api.post('/inventory/adjustments', { ...adjForm, product_id: parseInt(adjForm.product_id), quantity: parseFloat(adjForm.quantity) })
    setAdjModal(null); load()
  }

  return (
    <div className="p-8">
      <PageHeader title="Inventory" action={
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setAdjModal(true)}>Stock Adjustment</Btn>
          <Btn onClick={openCreate}>+ New Product</Btn>
        </div>
      } />
      <Card>
        <Table headers={['SKU', 'Name', 'Category', 'Unit', 'On Hand', 'Reorder', 'Cost', 'Sale Price', 'Actions']}>
          {products.map(p => (
            <Tr key={p.id}>
              <Td className="font-mono text-xs">{p.sku || '—'}</Td>
              <Td className="font-medium">{p.name}</Td>
              <Td><Badge label={p.category} color={CAT_COLORS[p.category]} /></Td>
              <Td>{p.unit || '—'}</Td>
              <Td className={parseFloat(p.quantity_on_hand) <= parseFloat(p.reorder_level) ? 'text-red-600 font-bold' : ''}>
                {parseFloat(p.quantity_on_hand).toLocaleString()}
              </Td>
              <Td>{parseFloat(p.reorder_level).toLocaleString()}</Td>
              <Td className="font-mono">${parseFloat(p.cost_price).toFixed(2)}</Td>
              <Td className="font-mono">${parseFloat(p.sale_price).toFixed(2)}</Td>
              <Td><Btn variant="secondary" onClick={() => openEdit(p)}>Edit</Btn></Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {modal && (
        <Modal title={modal === 'create' ? 'New Product' : 'Edit Product'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </Select>
              <Input label="Unit (e.g. kg, dozen)" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              <Input label="Cost Price" type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
              <Input label="Sale Price" type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
              <Input label="Reorder Level" type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={saveProduct}>Save</Btn>
            </div>
          </div>
        </Modal>
      )}

      {adjModal && (
        <Modal title="Stock Adjustment" onClose={() => setAdjModal(null)}>
          <div className="space-y-3">
            <Select label="Product" value={adjForm.product_id} onChange={e => setAdjForm(f => ({ ...f, product_id: e.target.value }))}>
              <option value="">Select product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input label="Date" type="date" value={adjForm.date} onChange={e => setAdjForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Quantity (positive = add, negative = remove)" type="number" step="0.001" value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input label="Reason" value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setAdjModal(null)}>Cancel</Btn>
              <Btn onClick={saveAdj}>Apply</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
