import { useEffect, useState } from 'react'
import api from '../api'
import { Card, PageHeader, Btn, Table, Tr, Td, Modal, Input, Select } from '../components/ui'

function emptyLine() { return { account_id: '', debit: '', credit: '', description: '' } }

export default function Journal() {
  const [entries, setEntries] = useState([])
  const [accounts, setAccounts] = useState([])
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ date: '', reference: '', description: '', lines: [emptyLine(), emptyLine()] })
  const [error, setError] = useState('')

  const load = () => api.get('/journal').then(r => setEntries(r.data))
  useEffect(() => {
    load()
    api.get('/accounts').then(r => setAccounts(r.data))
  }, [])

  function setLine(i, field, val) {
    setForm(f => {
      const lines = [...f.lines]
      lines[i] = { ...lines[i], [field]: val }
      return { ...f, lines }
    })
  }

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)

  async function save() {
    setError('')
    if (Math.abs(totalDebit - totalCredit) > 0.001) { setError('Entry must be balanced (debits = credits)'); return }
    const payload = {
      ...form,
      lines: form.lines.filter(l => l.account_id).map(l => ({
        account_id: parseInt(l.account_id),
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || null,
      }))
    }
    try {
      await api.post('/journal', payload)
      setModal(false)
      setForm({ date: '', reference: '', description: '', lines: [emptyLine(), emptyLine()] })
      load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error saving entry')
    }
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this journal entry?')) return
    await api.delete(`/journal/${id}`); load()
  }

  return (
    <div className="p-8">
      <PageHeader title="Journal Entries" action={<Btn onClick={() => setModal(true)}>+ New Entry</Btn>} />
      <Card>
        <Table headers={['Date', 'Reference', 'Description', 'Lines', 'Actions']}>
          {entries.map(e => (
            <Tr key={e.id} onClick={() => setDetail(e)}>
              <Td>{e.date}</Td>
              <Td>{e.reference || '—'}</Td>
              <Td>{e.description || '—'}</Td>
              <Td>{e.lines.length}</Td>
              <Td onClick={ev => ev.stopPropagation()}>
                <Btn variant="danger" onClick={() => deleteEntry(e.id)}>Delete</Btn>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Create Modal */}
      {modal && (
        <Modal title="New Journal Entry" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <Input label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Account</th>
                    <th className="px-3 py-2 text-left">Debit</th>
                    <th className="px-3 py-2 text-left">Credit</th>
                    <th className="px-3 py-2 text-left">Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">
                        <select className="w-full border rounded px-2 py-1 text-sm" value={line.account_id} onChange={e => setLine(i, 'account_id', e.target.value)}>
                          <option value="">Select...</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1"><input type="number" step="0.01" className="w-24 border rounded px-2 py-1 text-sm" value={line.debit} onChange={e => setLine(i, 'debit', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" step="0.01" className="w-24 border rounded px-2 py-1 text-sm" value={line.credit} onChange={e => setLine(i, 'credit', e.target.value)} /></td>
                      <td className="px-2 py-1"><input className="w-full border rounded px-2 py-1 text-sm" value={line.description} onChange={e => setLine(i, 'description', e.target.value)} /></td>
                      <td className="px-2 py-1"><button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600">✕</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td className="px-3 py-2 text-sm font-medium">Totals</td>
                    <td className="px-3 py-2 text-sm font-mono">{totalDebit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm font-mono">{totalCredit.toFixed(2)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <Btn variant="secondary" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))}>+ Add Line</Btn>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn onClick={save}>Post Entry</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={`Entry #${detail.id} — ${detail.date}`} onClose={() => setDetail(null)}>
          <p className="text-sm text-gray-500 mb-4">{detail.description}</p>
          <Table headers={['Account', 'Debit', 'Credit', 'Note']}>
            {detail.lines.map(l => (
              <Tr key={l.id}>
                <Td>{accounts.find(a => a.id === l.account_id)?.name || l.account_id}</Td>
                <Td className="font-mono">{parseFloat(l.debit).toFixed(2)}</Td>
                <Td className="font-mono">{parseFloat(l.credit).toFixed(2)}</Td>
                <Td>{l.description || '—'}</Td>
              </Tr>
            ))}
          </Table>
        </Modal>
      )}
    </div>
  )
}
