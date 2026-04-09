import { useEffect, useMemo, useState } from 'react'
import { createBudgetCategory, createBudgetEntry, deleteBudgetEntry, fetchBudgetEntries, updateBudgetEntry } from './api/budgetApi'

const emptyForm = {
  category: '',
  title: '',
  amount: '',
  note: '',
  spent_on: '',
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

function getTodayMonth() {
  return new Date().toISOString().slice(0, 7)
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number)
  const shifted = new Date(year, month - 1 + delta, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return monthFormatter.format(new Date(year, month - 1, 1))
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0))
}

function App() {
  const [month, setMonth] = useState(getTodayMonth)
  const [data, setData] = useState({ month: getTodayMonth(), total_spend: 0, categories: [], category_totals: [], entries: [] })
  const [expanded, setExpanded] = useState({})
  const [formState, setFormState] = useState({ mode: 'create', entryId: null, values: { ...emptyForm, spent_on: getTodayDate() } })
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await fetchBudgetEntries(month)
        setData(payload)
      } catch (err) {
        setError(err.message || 'Unable to load budget entries.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month])

  const categoryNames = useMemo(() => (data.categories || []).map((category) => category.name), [data.categories])

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev }
      categoryNames.forEach((category) => {
        if (next[category] === undefined) {
          next[category] = true
        }
      })
      return next
    })
  }, [categoryNames])

  const entriesByCategory = useMemo(() => {
    const grouped = Object.fromEntries(categoryNames.map((category) => [category, []]))
    for (const entry of data.entries || []) {
      grouped[entry.category] = [...(grouped[entry.category] || []), entry]
    }
    return grouped
  }, [categoryNames, data.entries])

  const totalsByCategory = useMemo(() => {
    const totals = Object.fromEntries(categoryNames.map((category) => [category, { total_amount: 0, entry_count: 0 }]))
    for (const item of data.category_totals || []) {
      totals[item.category] = item
    }
    return totals
  }, [categoryNames, data.category_totals])

  const topCategories = useMemo(() => (
    [...categoryNames].sort((left, right) => (totalsByCategory[right]?.total_amount || 0) - (totalsByCategory[left]?.total_amount || 0))
  ), [categoryNames, totalsByCategory])

  const openCreate = (category) => {
    const fallbackCategory = category || categoryNames[0] || ''
    if (!fallbackCategory) {
      window.alert('Create a category first.')
      return
    }
    setFormState({
      mode: 'create',
      entryId: null,
      values: {
        ...emptyForm,
        category: fallbackCategory,
        spent_on: `${month}-01` > getTodayDate() ? `${month}-01` : getTodayDate().startsWith(month) ? getTodayDate() : `${month}-01`,
      },
    })
    setIsEditorOpen(true)
  }

  const openEdit = (entry) => {
    setFormState({
      mode: 'edit',
      entryId: entry.id,
      values: {
        category: entry.category,
        title: entry.title,
        amount: String(entry.amount),
        note: entry.note || '',
        spent_on: entry.spent_on,
      },
    })
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setFormState({ mode: 'create', entryId: null, values: { ...emptyForm, spent_on: getTodayDate() } })
  }

  const handleChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value,
      },
    }))
  }

  const refreshMonth = async () => {
    const payload = await fetchBudgetEntries(month)
    setData(payload)
  }

  const handleCreateCategory = async () => {
    const name = window.prompt('New category name')
    if (!name) return
    setSaving(true)
    setError('')
    try {
      const category = await createBudgetCategory({ name })
      await refreshMonth()
      setExpanded((prev) => ({ ...prev, [category.name]: true }))
    } catch (err) {
      setError(err.message || 'Unable to create category.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        category: formState.values.category,
        title: formState.values.title.trim(),
        amount: Number(formState.values.amount),
        note: formState.values.note.trim() || null,
        spent_on: formState.values.spent_on,
      }

      if (formState.mode === 'edit' && formState.entryId) {
        await updateBudgetEntry(formState.entryId, payload)
      } else {
        await createBudgetEntry(payload)
      }

      await refreshMonth()
      closeEditor()
    } catch (err) {
      setError(err.message || 'Unable to save entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entryId) => {
    setSaving(true)
    setError('')
    try {
      await deleteBudgetEntry(entryId)
      await refreshMonth()
    } catch (err) {
      setError(err.message || 'Unable to delete entry.')
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (category) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  return (
    <div className="budget-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Monthly budget board</p>
          <h1>Track where your money is going without losing the monthly picture.</h1>
          <p className="hero-text">
            One board for monthly spend, one running total, and category buckets you can grow as your budget changes.
          </p>
        </div>
        <div className="hero-total-card">
          <span className="hero-total-label">Total expenditures</span>
          <strong className="hero-total-value">{formatCurrency(data.total_spend)}</strong>
          <div className="month-switcher">
            <button className="ghost-button" onClick={() => setMonth((prev) => shiftMonth(prev, -1))}>Previous</button>
            <div>
              <p className="month-label">{formatMonthLabel(month)}</p>
              <p className="month-key">{month}</p>
            </div>
            <button className="ghost-button" onClick={() => setMonth((prev) => shiftMonth(prev, 1))}>Next</button>
          </div>
        </div>
      </header>

      <section className="summary-strip">
        {topCategories.map((category) => (
          <article key={category} className="summary-card">
            <span>{category}</span>
            <strong>{formatCurrency(totalsByCategory[category]?.total_amount)}</strong>
            <small>{totalsByCategory[category]?.entry_count || 0} entries</small>
          </article>
        ))}
      </section>

      {!loading && categoryNames.length === 0 && (
        <div className="status-banner">
          No categories yet. Create your first category to start adding budget entries.
        </div>
      )}

      {error && <div className="status-banner status-banner--error">{error}</div>}
      {loading && <div className="status-banner">Loading entries...</div>}

      <section className="category-toolbar">
        <button className="ghost-button" onClick={handleCreateCategory} disabled={saving}>Create category</button>
      </section>

      <main className="category-stack">
        {categoryNames.length === 0 && !loading && (
          <section className="category-card">
            <div className="empty-state">
              <p>Create a category like Rent, Travel, Bills, or Savings to start organizing entries.</p>
            </div>
          </section>
        )}
        {categoryNames.map((category) => {
          const categoryEntries = entriesByCategory[category] || []
          const totals = totalsByCategory[category] || { total_amount: 0, entry_count: 0 }
          const isOpen = expanded[category]
          return (
            <section key={category} className="category-card">
              <header className="category-header">
                <button className="category-toggle" onClick={() => toggleCategory(category)}>
                  <span>
                    <strong>{category}</strong>
                    <small>{totals.entry_count} entries</small>
                  </span>
                  <span className="category-total">{formatCurrency(totals.total_amount)}</span>
                </button>
                <button className="add-button" onClick={() => openCreate(category)}>+ Add entry</button>
              </header>

              {isOpen && (
                <div className="entry-list">
                  {categoryEntries.length === 0 && (
                    <div className="empty-state">
                      <p>No entries for {category.toLowerCase()} in {formatMonthLabel(month)}.</p>
                    </div>
                  )}

                  {categoryEntries.map((entry) => (
                    <article key={entry.id} className="entry-card">
                      <div className="entry-main">
                        <div>
                          <h3>{entry.title}</h3>
                          <p>{entry.note || 'No note added.'}</p>
                        </div>
                        <div className="entry-meta">
                          <strong>{formatCurrency(entry.amount)}</strong>
                          <span>{entry.spent_on}</span>
                        </div>
                      </div>
                      <div className="entry-actions">
                        <button className="text-button" onClick={() => openEdit(entry)}>Edit</button>
                        <button className="text-button text-button--danger" onClick={() => handleDelete(entry.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </main>

      {isEditorOpen && (
        <div className="editor-backdrop" onClick={closeEditor}>
          <div className="editor-panel" onClick={(event) => event.stopPropagation()}>
            <div className="editor-header">
              <div>
                <p className="eyebrow">{formState.mode === 'edit' ? 'Update entry' : 'New entry'}</p>
                <h2>{formState.mode === 'edit' ? 'Refine this spending entry' : 'Add a fresh spending entry'}</h2>
              </div>
              <button className="icon-button" onClick={closeEditor}>Close</button>
            </div>

            <form className="editor-form" onSubmit={handleSubmit}>
              <label>
                <span>Category</span>
                <select value={formState.values.category} onChange={(event) => handleChange('category', event.target.value)}>
                  {categoryNames.length === 0 && <option value="">Create a category first</option>}
                  {categoryNames.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Title</span>
                <input value={formState.values.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="Electricity bill, Mutual fund SIP..." required />
              </label>

              <div className="form-grid">
                <label>
                  <span>Amount</span>
                  <input type="number" min="0.01" step="0.01" value={formState.values.amount} onChange={(event) => handleChange('amount', event.target.value)} required />
                </label>

                <label>
                  <span>Spent on</span>
                  <input type="date" value={formState.values.spent_on} onChange={(event) => handleChange('spent_on', event.target.value)} required />
                </label>
              </div>

              <label>
                <span>Note</span>
                <textarea rows="4" value={formState.values.note} onChange={(event) => handleChange('note', event.target.value)} placeholder="Optional detail for future reference" />
              </label>

              <div className="editor-actions">
                <button type="button" className="ghost-button" onClick={closeEditor}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving || categoryNames.length === 0}>{saving ? 'Saving...' : formState.mode === 'edit' ? 'Save changes' : 'Create entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App