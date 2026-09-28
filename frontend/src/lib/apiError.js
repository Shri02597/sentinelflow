/**
 * Turn an axios error into a string a human can read.
 *
 * FastAPI returns `detail` as a plain string for deliberate errors
 * ("Not authenticated") but as an *array of validation objects* for 422s:
 *
 *   { "detail": [{ "loc": ["body", "password"], "msg": "ensure this value
 *                 has at least 8 characters" }] }
 *
 * Rendering that array directly as a React child throws "Objects are not valid
 * as a React child", which unmounts the tree and shows a blank page — so a
 * password one character too short used to take the whole Register screen to
 * black instead of showing a message.
 */
export function apiErrorMessage(err, fallback = 'Something went wrong.') {
  const detail = err?.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) return detail

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null
        // Pydantic v2 prefixes the constraint with the type: "String should
        // have at least 8 characters". Drop that prefix — the field name
        // already tells the user what is wrong, so the type is noise.
        const cleaned = String(d?.msg ?? '')
          .replace(/^\w+\s+should\s+have\s+/i, 'must be ')
          .replace(/^value error,\s*/i, '')
          .trim()
        return field ? `${field}: ${cleaned}` : cleaned
      })
      .filter(Boolean)
    if (messages.length) return messages.join(' · ')
  }

  if (err?.response?.status === 422) return 'Please check the form and try again.'

  return fallback
}
