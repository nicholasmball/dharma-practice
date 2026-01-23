'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveSession } from './actions'
import { PracticeType, practiceTypeLabels } from '@/lib/types'

const DURATION_PRESETS = [
  { label: '10 min', seconds: 600 },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 },
  { label: '45 min', seconds: 2700 },
  { label: '60 min', seconds: 3600 },
]

const PRACTICE_TYPES: PracticeType[] = ['shamatha', 'vipashyana', 'mahamudra', 'dzogchen', 'other']

type TimerState = 'setup' | 'running' | 'paused' | 'completed'

interface TimerClientProps {
  defaultDuration: number
  defaultPracticeType: string
}

export default function TimerClient({ defaultDuration, defaultPracticeType }: TimerClientProps) {
  const router = useRouter()
  const [timerState, setTimerState] = useState<TimerState>('setup')
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration)
  const [customMinutes, setCustomMinutes] = useState('')
  const [practiceType, setPracticeType] = useState<PracticeType>(defaultPracticeType as PracticeType)
  const [timeRemaining, setTimeRemaining] = useState(defaultDuration)
  const [intervalBells, setIntervalBells] = useState(0) // 0 = off
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastBellTimeRef = useRef<number>(0)

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play singing bowl sound
  const playBell = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const now = ctx.currentTime

      // Create oscillator for the fundamental tone
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(220, now) // A3
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 4)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      // Create oscillator for overtone
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(440, now) // A4
      gain2.gain.setValueAtTime(0.15, now)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 3)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      // Create oscillator for higher overtone
      const osc3 = ctx.createOscillator()
      const gain3 = ctx.createGain()
      osc3.type = 'sine'
      osc3.frequency.setValueAtTime(660, now) // E5
      gain3.gain.setValueAtTime(0.08, now)
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 2)
      osc3.connect(gain3)
      gain3.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc3.start(now)

      osc1.stop(now + 4)
      osc2.stop(now + 3)
      osc3.stop(now + 2)
    } catch (e) {
      console.log('Audio not available')
    }
  }, [getAudioContext])

  // Timer logic
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1

          // Check for interval bells
          if (intervalBells > 0) {
            const elapsed = selectedDuration - newTime
            const bellInterval = intervalBells * 60
            if (elapsed > 0 && elapsed % bellInterval === 0 && elapsed !== lastBellTimeRef.current) {
              lastBellTimeRef.current = elapsed
              playBell()
            }
          }

          if (newTime <= 0) {
            clearInterval(intervalRef.current!)
            setTimerState('completed')
            playBell()
            return 0
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState, intervalBells, selectedDuration, playBell])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
    getAudioContext() // Initialize
    setTimeRemaining(selectedDuration)
    lastBellTimeRef.current = 0
    setTimerState('running')
  }

  const handlePause = () => {
    setTimerState('paused')
  }

  const handleResume = () => {
    setTimerState('running')
  }

  const handleEnd = () => {
    setTimerState('completed')
    playBell()
  }

  const handleSave = async () => {
    setSaving(true)
    const actualDuration = selectedDuration - timeRemaining
    const result = await saveSession({
      duration_seconds: timerState === 'completed' ? selectedDuration : actualDuration,
      practice_type: practiceType,
      notes: notes || undefined,
    })

    if (result.success) {
      router.push('/dashboard')
    } else {
      alert('Failed to save session: ' + result.error)
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setTimerState('setup')
    setTimeRemaining(selectedDuration)
    setNotes('')
  }

  const handleCustomDuration = () => {
    const mins = parseInt(customMinutes)
    if (mins > 0 && mins <= 180) {
      setSelectedDuration(mins * 60)
      setCustomMinutes('')
    }
  }

  // Setup screen
  if (timerState === 'setup') {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '32px', textAlign: 'center' }}>
          Begin Practice
        </h1>

        {/* Duration Selection */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '12px' }}>
            Duration
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                onClick={() => setSelectedDuration(preset.seconds)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: selectedDuration === preset.seconds ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: selectedDuration === preset.seconds ? 'var(--accent)' : 'var(--surface)',
                  color: selectedDuration === preset.seconds ? 'var(--background)' : 'var(--foreground)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              placeholder="Custom minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCustomDuration}
              disabled={!customMinutes}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                cursor: customMinutes ? 'pointer' : 'not-allowed',
                opacity: customMinutes ? 1 : 0.5,
              }}
            >
              Set
            </button>
          </div>
        </div>

        {/* Practice Type */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '12px' }}>
            Practice Type
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {PRACTICE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setPracticeType(type)}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: practiceType === type ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: practiceType === type ? 'var(--accent)' : 'var(--surface)',
                  color: practiceType === type ? 'var(--background)' : 'var(--foreground)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: practiceType === type ? 500 : 400,
                }}
              >
                {practiceTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Interval Bells */}
        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '12px' }}>
            Interval Bells (optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[0, 5, 10, 15].map((mins) => (
              <button
                key={mins}
                onClick={() => setIntervalBells(mins)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: intervalBells === mins ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: intervalBells === mins ? 'var(--accent)' : 'var(--surface)',
                  color: intervalBells === mins ? 'var(--background)' : 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {mins === 0 ? 'Off' : `Every ${mins} min`}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'var(--background)',
            fontSize: '1.125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Begin ({Math.floor(selectedDuration / 60)} minutes)
        </button>
      </div>
    )
  }

  // Running/Paused screen
  if (timerState === 'running' || timerState === 'paused') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        {/* Timer Circle */}
        <div style={{
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          border: '4px solid var(--accent)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '40px',
          opacity: timerState === 'paused' ? 0.6 : 1,
        }}>
          <p style={{ fontSize: '4rem', fontWeight: 300, fontFamily: 'monospace' }}>
            {formatTime(timeRemaining)}
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
            {practiceType}
          </p>
        </div>

        {timerState === 'paused' && (
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>Paused</p>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {timerState === 'running' ? (
            <button
              onClick={handlePause}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: 'var(--background)',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Resume
            </button>
          )}
          <button
            onClick={handleEnd}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            End Session
          </button>
        </div>
      </div>
    )
  }

  // Completed screen
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: '3px solid var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <span style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>✓</span>
      </div>

      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '8px' }}>
        Session Complete
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        {Math.floor(selectedDuration / 60)} minutes of {practiceType}
      </p>

      {/* Notes */}
      <div style={{ marginBottom: '24px', textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
          Session Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How was your practice? Any insights or observations..."
          rows={4}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleDiscard}
          disabled={saving}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            fontSize: '1rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1,
          }}
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '16px',
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
          {saving ? 'Saving...' : 'Save Session'}
        </button>
      </div>
    </div>
  )
}
