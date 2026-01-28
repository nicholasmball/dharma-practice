'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CustomPracticeType, practiceTypeLabels, BUILT_IN_PRACTICE_TYPES } from '@/lib/types'
import { createJournalEntry, updateJournalEntry } from './actions'

const SUGGESTED_TAGS = [
  'insight', 'difficulty', 'breakthrough', 'question', 'dream',
  'retreat', 'daily practice', 'gratitude', 'teacher guidance'
]

interface JournalFormProps {
  initialData?: {
    id: string
    title: string | null
    content: string
    tags: string[]
    practice_type: string | null
  }
  customPracticeTypes?: CustomPracticeType[]
}

export default function JournalForm({ initialData, customPracticeTypes = [] }: JournalFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState('')
  const [practiceType, setPracticeType] = useState<string>(initialData?.practice_type || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!initialData

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
    }
    setNewTag('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('Please write something in your entry.')
      return
    }

    setSaving(true)
    setError(null)

    const data = {
      title: title.trim() || undefined,
      content: content.trim(),
      tags,
      practice_type: practiceType || undefined,
    }

    try {
      if (isEditing) {
        const result = await updateJournalEntry(initialData.id, data)
        if (result?.error) {
          setError(result.error)
          setSaving(false)
        }
      } else {
        const result = await createJournalEntry(data)
        if (result?.error) {
          setError(result.error)
          setSaving(false)
        }
      }
    } catch (err) {
      // Redirect happened, which is expected
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(224, 85, 85, 0.1)',
          border: '1px solid rgba(224, 85, 85, 0.3)',
          color: 'var(--error)',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
          Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give this entry a title..."
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            outline: 'none',
            fontSize: '1rem',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
          Your Entry
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write about your practice, insights, questions, or experiences..."
          rows={12}
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            outline: 'none',
            fontSize: '1rem',
            lineHeight: '1.7',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Practice Type */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
          Related Practice (optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setPracticeType('')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: practiceType === '' ? '2px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: practiceType === '' ? 'var(--accent)' : 'var(--surface)',
              color: practiceType === '' ? 'var(--background)' : 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            None
          </button>
          {/* Built-in types (except 'other') */}
          {BUILT_IN_PRACTICE_TYPES.filter(t => t !== 'other').map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setPracticeType(type)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: practiceType === type ? '2px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: practiceType === type ? 'var(--accent)' : 'var(--surface)',
                color: practiceType === type ? 'var(--background)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {practiceTypeLabels[type].split(' (')[0]}
            </button>
          ))}
          {/* Custom types */}
          {customPracticeTypes.map(ct => {
            const typeKey = ct.name.toLowerCase()
            return (
              <button
                key={ct.name}
                type="button"
                onClick={() => setPracticeType(typeKey)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: practiceType === typeKey ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: practiceType === typeKey ? 'var(--accent)' : 'var(--surface)',
                  color: practiceType === typeKey ? 'var(--background)' : 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {ct.name}
              </button>
            )
          })}
          {/* Other always last */}
          <button
            type="button"
            onClick={() => setPracticeType('other')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: practiceType === 'other' ? '2px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: practiceType === 'other' ? 'var(--accent)' : 'var(--surface)',
              color: practiceType === 'other' ? 'var(--background)' : 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {practiceTypeLabels['other']}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
          Tags (optional)
        </label>

        {/* Current tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {tags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--background)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--background)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add new tag */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag(newTag)
              }
            }}
            placeholder="Add a tag..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              outline: 'none',
              fontSize: '0.875rem',
            }}
          />
          <button
            type="button"
            onClick={() => handleAddTag(newTag)}
            disabled={!newTag.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              cursor: newTag.trim() ? 'pointer' : 'not-allowed',
              opacity: newTag.trim() ? 1 : 0.5,
              fontSize: '0.875rem',
            }}
          >
            Add
          </button>
        </div>

        {/* Suggested tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).slice(0, 6).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAddTag(tag)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: '14px 28px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '14px 28px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'var(--background)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>
    </form>
  )
}
