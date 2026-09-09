import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, getRelatedRequests, updateEvent, addIncidentNote, getEventNotes, getEvents } from '../../services/api.js'
import Badge from '../../components/Badge.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'

const STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']

export default function ThreatDetails() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [related, setRelated] = useState([])
  const [relatedEvents, setRelatedEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  function loadNotes() {
    getEventNotes(id).then((res) => setNotes(res.data))
  }

  function load() {
    getEvent(id).then((res) => {
      setEvent(res.data)
      // Other events tied to the same account (or, for unauthenticated
      // traffic, the same source IP) — helps an analyst spot a pattern
      // rather than looking at this one event in isolation.
      const filterParams = res.data.user_id
        ? { user_id: res.data.user_id }
        : { source_ip: res.data.source_ip }
      getEvents({ ...filterParams, limit: 6 }).then((r) =>
        setRelatedEvents(r.data.filter((e) => e.id !== res.data.id))
      )
    })
    getRelatedRequests(id).then((res) => setRelated(res.data))
    loadNotes()
  }
  useEffect(load, [id])

  async function changeStatus(status) {
    setBusy(true)
    try {
      const res = await updateEvent(id, { status })
      setEvent(res.data)
    } finally {
      setBusy(false)
    }
  }

  async function submitNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    await addIncidentNote(id, note)
    setNote('')
    loadNotes()
  }

  if (!event) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{event.attack_type.replaceAll('_', ' ')}</h1>
        <Badge level={event.severity} />
      </div>

      <div className="card space-y-2 text-sm">
        <div><span className="text-slate-400">Why it was detected:</span> {event.description}</div>
        <div><span className="text-slate-400">Source IP:</span> {event.source_ip}</div>
        <div><span className="text-slate-400">Affected user:</span> {event.user_id ?? 'unauthenticated / IP-based'}</div>
        <div><span className="text-slate-400">Endpoint:</span> {event.endpoint}</div>
        <div><span className="text-slate-400">Risk score at detection:</span> {event.risk_score}</div>
        <div><span className="text-slate-400">Confidence:</span> {(event.confidence * 100).toFixed(0)}%</div>
        <div><span className="text-slate-400">Timestamp:</span> {new Date(event.timestamp).toLocaleString()}</div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2 text-sm text-slate-300">Status</h3>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s} disabled={busy} onClick={() => changeStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs border ${
                event.status === s ? 'bg-accent text-bg border-accent' : 'border-slate-700 text-slate-300 hover:border-accent'
              }`}
            >
              {s.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2 text-sm text-slate-300">
          Related Events ({event.user_id ? 'same user' : 'same IP'})
        </h3>
        <div className="space-y-2">
          {relatedEvents.length === 0 && <p className="text-sm text-slate-500">No other events found.</p>}
          {relatedEvents.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2 text-sm text-slate-300">Related Request Timeline</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
          {related.map((r) => (
            <div key={r.id} className="flex justify-between border-b border-slate-800 py-1">
              <span>{new Date(r.timestamp).toLocaleTimeString()} — {r.method} {r.endpoint}</span>
              <span className={r.status_code >= 400 ? 'text-red-400' : 'text-green-400'}>{r.status_code}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-sm text-slate-300">Investigation Notes</h3>
        <div className="space-y-2">
          {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="border-b border-slate-800 pb-2 text-sm">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{n.author_username ?? `user #${n.author_id}`}</span>
                <span>{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="text-slate-300">{n.note}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submitNote} className="card space-y-2">
        <h3 className="font-semibold text-sm text-slate-300">Add a Note</h3>
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="Add a note about this investigation…"
          className="w-full bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <button className="bg-accent text-bg font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-accent-dim">
          Add Note
        </button>
      </form>
    </div>
  )
}
