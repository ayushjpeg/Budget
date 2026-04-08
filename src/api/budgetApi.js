const DEFAULT_BASE_URL = 'https://common-backend.ayux.in/api'
const stripTrailingSlash = (value) => value.replace(/\/$/, '')

const API_BASE_URL = stripTrailingSlash(import.meta.env.VITE_BACKEND_URL || DEFAULT_BASE_URL)

const buildHeaders = (body, extraHeaders = {}) => {
  const headers = new Headers(extraHeaders)
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    body,
    credentials: 'include',
    headers: buildHeaders(body, headers),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  const payload = await response.text()
  return payload ? JSON.parse(payload) : null
}

export const fetchBudgetEntries = (month) => request(`/budget/entries?month=${encodeURIComponent(month)}`)

export const createBudgetEntry = (payload) => request('/budget/entries', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const updateBudgetEntry = (entryId, payload) => request(`/budget/entries/${entryId}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})

export const deleteBudgetEntry = (entryId) => request(`/budget/entries/${entryId}`, {
  method: 'DELETE',
})