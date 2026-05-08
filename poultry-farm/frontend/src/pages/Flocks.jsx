import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input, Select, Badge, StatCard } from '../components/ui'

const STATUS_COLORS = { active: 'green', sold: 'blue', closed: 'gray' }

export default function Flocks() {
  const [flocks, setFlocks] = useState([])
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('mortality')
  const [records, setRecords] = useState([])
  const [modal, setModal] = useState(null) // 'flock' | 'record'
  const [flockForm, setFlockForm] = useState({ batch_number: '', breed: '', date_acquired: '', initial_count: '', notes: '' })
  const [recForm, setRecForm] = useState({})

  const loadFlocks = () => api.get('/flocks').then(r => setFlocks(r.data))
  useEffect(() => {
    loadFlocks()
    api.get('/inventory/products').then(r => setProducts(r.data.filter(p => p.category === 'feed')))
  }, [])

  async function selectFlock(f) {
    setSelected(f)
    setTab('mortality')
    const [sumRes, recRes] = await Promise.all([
      api.get(`/flocks/${f.id}/summary`),
      api.get(`/flocks/${f.id}/mortality`)
    ])
    setSummary(sumRes.data)
    setRecords(recRes.data)
  }

  async function loadTab(t, fid) {
    setTab(t)
    const endpoints = { mortality: 'mortality', feed: 'feed', production: 'production' }
    const res = await api.get(`/flocks/${fid}/${endpoints[t]}`)
    setRecords(res.data)
  }

  async function saveFlock() {
    await api.post('/flocks', { ...flockForm, initial_count: parseInt(flockForm.initial_count) })
    setModal(null); loadFlocks()
  }

  async function saveRecord() {
    const fid = selected.id
    if (tab === 'mortality') {
      await api.post(`/flocks/${fid}/mortality`, { ...recForm, count: parseInt(recForm.count) })
    } else if (tab === 'feed') {
      await api.post(`/flocks/${fid}/feed`, { ...recForm, product_id: parseInt(recForm.product_id), quantity_kg: parseFloat(recForm.quantity_kg) })
    } else {
      await api.post(`/flocks/${fid}/production`, { ...recForm, eggs_collected: parseInt(recForm.eggs_collected) })
    }
    setModal(null)
    const [sumRes, recRes] = await Promise.all([
      api.get(`/flocks/${fid}/summary`),
      api.get(`/flocks/${fid}/${tab}`)
    ])
    setSummary(sumRes.data)
    setRecords(recRes.data)
    loadFlocks()
  }

  function openRecordModal() {
    const today = new Date().toISOString().split('T')[0]
    if (tab === 'mortality') setRecForm({ date: today, count: '', cause: '' })
    else if (tab === 'feed') setRecForm({ date: today, product_id: '', quantity_kg: '' })
    else setRecForm({ date: today, eggs_collected: '', notes: '' })
    setModal('record')
  }

  return (
    <div className="p-8">
      <PageHeader title="Flock Management" action={<Btn onClick={() => { setFlockForm({ batch_number: '', breed: '', date_acquired: '', initial_count: '', notes: '' }); setModal('flock') }}>+ New Flock</Btn>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flock List */}
        <Card>
          <h2 className="font-semibold mb-3">Flocks</h2>
          <div className="space-y-2">
            {flocks.map(f => (
              <div key={f.id} onClick={() => selectFlock(f)}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-green-50 transition-colors ${selected?.id === f.id ? 'border-green-500 bg-green-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{f.batch_number}</p>
                    <p className="text-xs text-gray-500">{f.breed || 'Unknown breed'}</p>
                    <p className="text-xs text-gray-400">{f.date_acquired}</p>
                  </div>
                  <div className="text-right">
                    <Badge label={f.status} color={STATUS_COLORS[f.status]} />
                    <p className="text-sm font-bold text-green-700 mt-1">{f.current_count.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">birds</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Flock Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card><p className="text-gray-400 text-center py-8">Select a flock to view details</p></Card>
          ) : (
            <div className="space-y-4">
              {summary && (
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Current Birds" value={summary.current_count.toLocaleString()} icon="🐔" color="green" />
                  <StatCard label="Total Mortality" value={`${summary.total_mortality} (${summary.mortality_rate}%)`} icon="💀" color="red" />
                  <StatCard label="Eggs Collected" value={summary.total_eggs_collected.toLocaleString()} icon="🥚" color="yellow" />
                </div>
              )}

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {['mortality', 'feed', 'production'].map(t => (
                      <button key={t} onClick={() => loadTab(t, selected.id)}
                        className={`px-3 py-1 rounded-lg text-sm capitalize ${tab === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {t === 'mortality' ? '💀 Mortality' : t === 'feed' ? '🌾 Feed' : '🥚 Production'}
                      </button>
                    ))}
                  </div>
                  <Btn onClick={openRecordModal}>+ Add Record</Btn>
                </div>

                {tab === 'mortality' && (
                  <Table headers={['Date', 'Count', 'Cause']}>
                    {records.map(r => <Tr key={r.id}><Td>{r.date}</Td><Td className="text-red-600 font-medium">{r.count}</Td><Td>{r.cause || '—'}</Td></Tr>)}
                  </Table>
                )}
                {tab === 'feed' && (
                  <Table headers={['Date', 'Product', 'Quantity (kg)']}>
                    {records.map(r => <Tr key={r.id}><Td>{r.date}</Td><Td>{products.find(p => p.id === r.product_id)?.name || r.product_id}</Td><Td>{r.quantity_kg} kg</Td></Tr>)}
                  </Table>
                )}
                {tab === 'production' && (
                  <Table headers={['Date', 'Eggs Collected', 'Notes']}>
                    {records.map(r => <Tr key={r.id}><Td>{r.date}</Td><Td className="text-yellow-600 font-medium">{r.eggs_collected}</Td><Td>{r.notes || '—'}</Td></Tr>)}
                  </Table>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* New Flock Modal */}
      {modal === 'flock' && (
        <Modal title="New Flock" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Batch Number *" value={flockForm.batch_number} onChange={e => setFlockForm(f => ({ ...f, batch_number: e.target.value }))} />
              <Input label="Breed" value={flockForm.breed} onChange={e => setFlockForm(f => ({ ...f, breed: e.target.value }))} />
              <Input label="Date Acquired" type="date" value={flockForm.date_acquired} onChange={e => setFlockForm(f => ({ ...f, date_acquired: e.target.value }))} />
              <Input label="Initial Count *" type="number" value={flockForm.initial_count} onChange={e => setFlockForm(f => ({ ...f, initial_count: e.target.value }))} />
            </div>
            <Input label="Notes" value={flockForm.notes} onChange={e => setFlockForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={saveFlock}>Create Flock</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Modal */}
      {modal === 'record' && (
        <Modal title={`Add ${tab} record — ${selected?.batch_number}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Input label="Date" type="date" value={recForm.date} onChange={e => setRecForm(f => ({ ...f, date: e.target.value }))} />
            {tab === 'mortality' && <>
              <Input label="Count" type="number" value={recForm.count} onChange={e => setRecForm(f => ({ ...f, count: e.target.value }))} />
              <Input label="Cause" value={recForm.cause} onChange={e => setRecForm(f => ({ ...f, cause: e.target.value }))} />
            </>}
            {tab === 'feed' && <>
              <Select label="Feed Product" value={recForm.product_id} onChange={e => setRecForm(f => ({ ...f, product_id: e.target.value }))}>
                <option value="">Select feed...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input label="Quantity (kg)" type="number" step="0.001" value={recForm.quantity_kg} onChange={e => setRecForm(f => ({ ...f, quantity_kg: e.target.value }))} />
            </>}
            {tab === 'production' && <>
              <Input label="Eggs Collected" type="number" value={recForm.eggs_collected} onChange={e => setRecForm(f => ({ ...f, eggs_collected: e.target.value }))} />
              <Input label="Notes" value={recForm.notes} onChange={e => setRecForm(f => ({ ...f, notes: e.target.value }))} />
            </>}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={saveRecord}>Save</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
