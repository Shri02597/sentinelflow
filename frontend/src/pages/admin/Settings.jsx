import { useEffect, useState } from 'react'
import { getDetectionSettings, updateDetectionSettings } from '../../services/api.js'
import { SectionHeader, Skeleton, Button } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

const GROUPS = [
  {
    name: 'Brute force',
    icon: 'key',
    hint: 'Failed logins on one account inside the window.',
    fields: [
      { key: 'brute_force_max_attempts', label: 'Max failed attempts', step: 1 },
      { key: 'brute_force_window_seconds', label: 'Window (seconds)', step: 10 },
    ],
  },
  {
    name: 'Abnormal rate',
    icon: 'activity',
    hint: 'Request volume from a single source IP.',
    fields: [
      { key: 'abnormal_rate_suspicious_min', label: 'Suspicious threshold (req)', step: 5 },
      { key: 'abnormal_rate_window_seconds', label: 'Window (seconds)', step: 5 },
    ],
  },
  {
    name: 'Suspicious endpoint',
    icon: 'search',
    hint: 'Repeated 404/403s — endpoint or directory enumeration.',
    fields: [
      { key: 'suspicious_endpoint_threshold', label: '404/403 threshold', step: 1 },
      { key: 'suspicious_endpoint_window_seconds', label: 'Window (seconds)', step: 10 },
    ],
  },
  {
    name: 'Behavioural anomaly',
    icon: 'events',
    hint: 'How far a session deviates from its own historical baseline.',
    fields: [
      { key: 'behavioral_deviation_multiplier', label: 'Deviation multiplier', step: 0.5 },
    ],
  },
]

export default function Settings() {
  const [values, setValues] = useState(null)
  const [saved, setSaved] = useState(false)

  function load() {
    getDetectionSettings().then((res) => setValues(res.data))
  }
  useEffect(load, [])

  function update(key) {
    return (e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))
  }

  async function handleSave() {
    const res = await updateDetectionSettings(values)
    setValues(res.data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!values) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-52" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <SectionHeader title="Detection Settings" subtitle="Thresholds for each detector — applied to live traffic immediately" />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-severity-medium/25 bg-severity-medium/8 px-4 py-3">
        <Icon name="warn" size={15} className="mt-px shrink-0 text-severity-medium" />
        <p className="text-xs leading-relaxed text-slate-400">
          These are in-memory overrides. They reset to the <code className="font-mono text-slate-300">.env</code> defaults
          whenever the backend restarts, so they are not a place to keep permanent tuning.
        </p>
      </div>

      <div className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.name} className="card">
            <div className="card-header">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft border border-accent/25 text-accent">
                  <Icon name={g.icon} size={15} />
                </span>
                <div>
                  <h2 className="card-title">{g.name}</h2>
                  <p className="card-subtitle">{g.hint}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.fields.map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input
                    type="number"
                    step={f.step}
                    value={values[f.key]}
                    onChange={update(f.key)}
                    aria-label={`${g.name}: ${f.label}`}
                    className="input font-mono text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} icon={<Icon name="check" size={14} />}>
          Save changes
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-severity-low">
            <Icon name="check" size={13} />
            Saved — active on live traffic
          </span>
        )}
      </div>
    </div>
  )
}
