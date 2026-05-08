import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input } from '../components/ui'

function ContactModal({ title, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <Input label="Name *" value={form.name} onChange={f('name')} />
        <Input label="Email" value={form.email || ''} onChange={f('email')} />
        <Input label="Phone" value={form.phone || ''} onChange={f('phone')} />
        <Input label="Address" value={form.address || ''} onChange={f('address')} />
        <div className="flex gap-2 justify-end">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(form)}>Save</Btn>
        </div>
      </div>
    </Modal>
  )
}

function ContactPage({ title, endpoint }) {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const blank = { name: '', email: '', phone: '', address: '' }
  const load = () => api.get(endpoint).then(r => setItems(r.data))
  useEffect(() => { load() }, [])

  async function save(form) {
    if (modal === 'create') await api.post(endpoint, form)
    else await api.put(`${endpoint}/${modal.id}`, form)
    setModal(null); load()
  }

  async function del(id) {
    if (!confirm('Delete?')) return
    await api.delete(`${endpoint}/${id}`); load()
  }

  return (
    <div className="p-8">
      <PageHeader title={title} action={<Btn onClick={() => setModal('create')}>+ New</Btn>} />
      <Card>
        <Table headers={['Name', 'Email', 'Phone', 'Actions']}>
          {items.map(c => (
            <Tr key={c.id}>
              <Td className="font-medium">{c.name}</Td>
              <Td>{c.email || '—'}</Td>
              <Td>{c.phone || '—'}</Td>
              <Td>
                <Btn variant="secondary" onClick={() => setModal(c)} className="mr-2">Edit</Btn>
                <Btn variant="danger" onClick={() => del(c.id)}>Delete</Btn>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
      {modal && (
        <ContactModal
          title={modal === 'create' ? `New ${title.slice(0, -1)}` : `Edit ${title.slice(0, -1)}`}
          initial={modal === 'create' ? blank : modal}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export function Customers() { return <ContactPage title="Customers" endpoint="/customers" /> }
export function Vendors() { return <ContactPage title="Vendors" endpoint="/vendors" /> }
