import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getEvent, getRelatedRequests, updateEvent, addIncidentNote, getEventNotes, getEvents,
} from '../../services/api.js'
import Badge from '../../components/Badge.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'
import ResponsePanel from './ResponsePanel.jsx'
import { Button, Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

const STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-line/60 last:border-0">
      <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

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

  if (!event) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <Link to="/security/events" className="link text-2xs font-semibold inline-flex items-center gap-1 mb-4">
        <span className="rotate-180"><Icon name="arrow" size={12} /></span>
        All events
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 capitalize">
            {String(event.attack_type ?? '').replaceAll('_', ' ').toLowerCase()}
          </h1>
          <p className="mt-1 text-xs text-slate-500">Event #{event.id} · {new Date(event.timestamp).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge level={event.severity} />
          <Badge level={event.status} className="badge-neutral">{String(event.status ?? '').replaceAll('_', ' ')}</Badge>
        </div>
      </div>

      <div className="space-y-5">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="eye" size={14} className="text-accent" />
              Detection Detail
            </h2>
            <span className="text-2xs font-mono text-slate-500">risk {event.risk_score}/100</span>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-slate-300">{event.description}</p>
          <Row label="Source IP" value={event.source_ip} mono />
          <Row label="Affected user" value={event.user_id ?? 'unauthenticated / IP-based'} mono />
          <Row label="Endpoint" value={event.endpoint} mono />
          <Row label="Confidence" value={`${((event.confidence ?? 0) * 100).toFixed(0)}%`} />
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Triage Status</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => changeStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  event.status === s
                    ? 'bg-accent-soft text-accent border-accent/40'
                    : 'border-line text-slate-400 hover:border-line-strong hover:text-slate-100'
                }`}
              >
                {s.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <ResponsePanel event={event} onChanged={load} />

        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="events" size={14} className="text-accent" />
              Related Events
            </h2>
            <span className="text-2xs text-slate-500">same {event.user_id ? 'user' : 'IP'}</span>
          </div>
          {relatedEvents.length === 0 ? (
            <p className="text-xs text-slate-500">No other events found.</p>
          ) : (
            <div className="space-y-0.5 -mx-2 px-2">
              {relatedEvents.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="activity" size={14} className="text-accent" />
              Request Timeline
            </h2>
            <span className="text-2xs text-slate-500">{related.length} requests</span>
          </div>
          {related.length === 0 ? (
            <p className="text-xs text-slate-500">No related requests.</p>
          ) : (
            <div className="-mx-2 max-h-64 overflow-y-auto">
              <table className="table">
                <tbody>
                  {related.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-2xs text-slate-500 whitespace-nowrap w-24">
                        {new Date(r.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="font-mono text-2xs text-slate-300">
                        <span className="text-slate-500 mr-2">{r.method}</span>
                        {r.endpoint}
                      </td>
                      <td className={`font-mono text-2xs font-bold text-right w-14 ${r.status_code >= 400 ? 'text-severity-critical' : 'text-severity-low'}`}>
                        {r.status_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="inbox" size={14} className="text-accent" />
              Investigation Notes
            </h2>
            <span className="text-2xs text-slate-500">{notes.length}</span>
          </div>
          {notes.length === 0 ? (
            <p className="text-xs text-slate-500 mb-3">No notes yet.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {notes.map((n) => (
                <div key={n.id} className="px-3 py-2 rounded-lg bg-bg-sunken/60 border border-line">
                  <div className="flex justify-between gap-2 text-2xs text-slate-500 mb-1">
                    <span className="text-slate-300 font-semibold">{n.author_username ?? `user #${n.author_id}`}</span>
                    <span className="font-mono">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{n.note}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitNote} className="flex flex-col gap-2 sm:flex-row">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note about this investigation…"
              className="input resize-none flex-1"
            />
            <Button variant="primary" type="submit" icon={<Icon name="plus" size={13} />} className="self-start">
              Add note
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
