'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { JournalEntry, PracticeType, practiceTypeLabels } from '@/lib/types'
import { deleteJournalEntry } from './actions'

const PRACTICE_TYPES: (PracticeType | 'all')[] = ['all', 'shamatha', 'vipashyana', 'mahamudra', 'dzogchen', 'other']

export default function JournalList({
  entries,
  allTags,
  initialSearch,
  initialTag,
  initialType,
}: {
  entries: JournalEntry[]
  allTags: string[]
  initialSearch?: string
  initialTag?: string
  initialType?: string
}) {
  const [search, setSearch] = useState(initialSearch || '')
  const [selectedTag, setSelectedTag] = useState(initialTag || '')
  const [selectedType, setSelectedType] = useState(initialType || 'all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filter entries - memoized to avoid recalculating on every render
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesTitle = entry.title?.toLowerCase().includes(searchLower)
        const matchesContent = entry.content.toLowerCase().includes(searchLower)
        const matchesTags = entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        if (!matchesTitle && !matchesContent && !matchesTags) return false
      }

      // Tag filter
      if (selectedTag && !entry.tags?.includes(selectedTag)) return false

      // Type filter
      if (selectedType !== 'all' && entry.practice_type !== selectedType) return false

      return true
    })
  }, [entries, search, selectedTag, selectedType])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    setDeleting(id)
    const result = await deleteJournalEntry(id)
    if (result.error) {
      alert('Failed to delete: ' + result.error)
    }
    setDeleting(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            outline: 'none',
            width: '100%',
          }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Practice Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Practice Types</option>
            {PRACTICE_TYPES.filter(t => t !== 'all').map(type => (
              <option key={type} value={type}>
                {practiceTypeLabels[type as PracticeType]}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          {(search || selectedTag || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearch('')
                setSelectedTag('')
                setSelectedType('all')
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Entry Count */}
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
      </p>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>
            {entries.length === 0 ? 'No journal entries yet.' : 'No entries match your filters.'}
          </p>
          {entries.length === 0 && (
            <Link
              href="/journal/new"
              style={{ color: 'var(--accent)' }}
            >
              Write your first entry →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              {/* Entry Header */}
              <div
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                    {entry.title || 'Untitled Entry'}
                  </h3>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', flexShrink: 0, marginLeft: '16px' }}>
                    {expandedId === entry.id ? '▲' : '▼'}
                  </span>
                </div>

                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '12px' }}>
                  {formatDate(entry.created_at)}
                </p>

                {/* Preview text (first 150 chars) */}
                {expandedId !== entry.id && (
                  <p style={{ color: 'var(--foreground)', opacity: 0.8, fontSize: '0.9rem' }}>
                    {entry.content.length > 150 ? entry.content.substring(0, 150) + '...' : entry.content}
                  </p>
                )}

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {entry.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--background)',
                          color: 'var(--accent)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {entry.practice_type && (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--accent)',
                          color: 'var(--background)',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize',
                        }}
                      >
                        {entry.practice_type}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {expandedId === entry.id && (
                <div style={{ padding: '0 20px 20px' }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.7',
                  }}>
                    {entry.content}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href={`/journal/${entry.id}/edit`}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--accent)',
                        color: 'var(--background)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(entry.id)
                      }}
                      disabled={deleting === entry.id}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: '1px solid var(--error)',
                        backgroundColor: 'transparent',
                        color: 'var(--error)',
                        fontSize: '0.875rem',
                        cursor: deleting === entry.id ? 'not-allowed' : 'pointer',
                        opacity: deleting === entry.id ? 0.5 : 1,
                      }}
                    >
                      {deleting === entry.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
