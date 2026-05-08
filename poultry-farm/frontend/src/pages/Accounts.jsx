import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input, Select, Badge } from '../components/ui'

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense']
const TYPE_COLORS = { asset: 'blue', liability: 'red', equity: 'green', revenue: 'green', expense: 'yellow' }

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [modal, setModal] = useState(null) // null | 'create' | account obj
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', parent_id: '' })

  const load = () => api.get('/accounts').then(r => setAccounts(r.data))
  useEffect(() => { load() }, [])

  function openCreate() { setForm({ code: '', name: '', type: 'asset', parent_id: '' }); setModal('create') }
  function openEdit(a) { setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id || '' }); setModal(a) }

  async function save() {
    const payload = { ...form, parent_id: form.parent_id || null }
    if (modal === 'create') await api.post('/accounts', payload)
    else await api.put(`/accounts/${modal.id}`, payload)
    setModal(null); load()
  }

  async function deactivate(id) {
    if (!confirm('Deactivate this account?')) return
    await api.delete(`/accounts/${id}`); load()
  }

  return (
    <div className="p-8">
      <PageHeader title="Chart of Accounts" action={<Btn onClick={openCreate}>+ New Account</Btn>} />
      <Card>
        <Table headers={['Code', 'Name', 'Type', 'Status', 'Actions']}>
          {accounts.map(a => (
            <Tr key={a.id}>
              <Td className="font-mono">{a.code}</Td>
              <Td>{a.name}</Td>
              <Td><Badge label={a.type} color={TYPE_COLORS[a.type]} /></Td>
              <Td><Badge label={a.is_active ? 'Active' : 'Inactive'} color={a.is_active ? 'green' : 'gray'} /></Td>
              <Td>
                <Btn variant="secondary" onClick={() => openEdit(a)} className="mr-2">Edit</Btn>
                {a.is_active && <Btn variant="danger" onClick={() => deactivate(a.id)}>Deactivate</Btn>}
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {modal && (
        <Modal title={modal === 'create' ? 'New Account' : 'Edit Account'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Input label="Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Parent Account (optional)" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </Select>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
