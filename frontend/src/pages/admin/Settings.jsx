import { useEffect, useState } from 'react'
import { getDetectionSettings, updateDetectionSettings } from '../../services/api.js'

const FIELDS = [
  { key: 'brute_force_max_attempts', label: 'Brute Force — Max Failed Attempts', step: 1 },
  { key: 'brute_force_window_seconds', label: 'Brute Force — Window (seconds)', step: 10 },
  { key: 'abnormal_rate_suspicious_min', label: 'Abnormal Rate — Suspicious Threshold (req/window)', step: 5 },
  { key: 'abnormal_rate_window_seconds', label: 'Abnormal Rate — Window (seconds)', step: 5 },
  { key: 'suspicious_endpoint_threshold', label: 'Suspicious Endpoint — 404/403 Threshold', step: 1 },
  { key: 'suspicious_endpoint_window_seconds', label: 'Suspicious Endpoint — Window (seconds)', step: 10 },
  { key: 'behavioral_deviation_multiplier', label: 'Behavioral Anomaly — Deviation Multiplier', step: 0.5 },
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

  if (!values) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-2">Detection Settings</h1>
      <p className="text-sm text-slate-500 mb-6">
        Changes apply immediately to live traffic. These are in-memory overrides —
        they reset to .env defaults on backend restart.
      </p>
      <div className="card space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-300">{f.label}</label>
            <input
              type="number" step={f.step} value={values[f.key]} onChange={update(f.key)}
              className="w-28 bg-bg-panel2 border border-slate-700 rounded-lg px-2 py-1 text-sm text-right"
            />
          </div>
        ))}
        <button onClick={handleSave} className="w-full bg-accent text-bg font-semibold py-2 rounded-lg hover:bg-accent-dim mt-2">
          {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
