#!/usr/bin/env node
// Teacher-voice test runner.
//
// Modes (--mode=):
//   single     (default) — each test question as a fresh, single-turn
//              conversation, per variant per model.
//   multiturn  — scripted multi-turn conversations (invented practitioner
//              messages), background attached every turn, real replies
//              chained in as genuine assistant turns.
//   bookuse    — balla-bot's own EVERYDAY/LOOKUP/JUDGEMENT turns
//              (scripts/teacher-voice-library-matrix.ts), no background,
//              to check the teacher consults its library the way it should.
//   remeasure  — re-run the pure text measures (word count, ends-on-a-
//              question, etc.) over an existing run's saved replies, no
//              model calls. Use this to fix a measures bug without
//              re-spending live calls.
//
// Run with, e.g.:
//   node scripts/teacher-voice-test.ts --mode=single --variants=today,approved --models=balanced,deep
//   node scripts/teacher-voice-test.ts --mode=multiturn --pairs=approved:balanced,approved:deep,today:balanced
//   node scripts/teacher-voice-test.ts --mode=bookuse --variants=approved --models=balanced
//   node scripts/teacher-voice-test.ts --mode=remeasure --run=teacher-voice-output/<run-id>
//
// See "node scripts/teacher-voice-test.ts --help" for all options.
//
// PRIVACY: the practitioner background used here is entirely invented
// (scripts/teacher-voice-fixtures.ts). This script never reads the real
// database or the migration-capture/ archive. Its output directory is
// git-ignored (see .gitignore: /teacher-voice-output/).

import Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { getVariant, TEACHER_VOICE_VARIANTS, type TeacherVoiceVariant } from '../src/lib/teacher/variants.ts'
import { isFollowUpTurn } from '../src/lib/teacher/prompt.ts'
import { INVENTED_BACKGROUND } from './teacher-voice-fixtures.ts'
import { TEST_QUESTIONS, type TestQuestion } from './teacher-voice-questions.ts'
import { measureReply, type ReplyMeasures } from './teacher-voice-measures.ts'
import { SCRIPTED_CONVERSATIONS } from './teacher-voice-conversations.ts'
import { LIBRARY_MATRIX_TURNS, type LibraryMatrixTurn } from './teacher-voice-library-matrix.ts'
import { parseMarkerStream, LIBRARY_START, STREAM_DONE, STREAM_ERROR } from '../src/lib/teacher/stream-markers.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..')

// The two teacher depths the owner can pick in Settings. Model IDs match
// TEACHER_MODEL_ALLOWLIST in src/app/api/chat/route.ts.
const MODEL_IDS: Record<string, string> = {
  balanced: 'claude-sonnet-5',
  deep: 'claude-opus-5',
}

const MAX_TOKENS = 1024 // matches route.ts

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface CliOptions {
  mode: 'single' | 'multiturn' | 'bookuse' | 'remeasure'
  variants: string[]
  models: string[]
  pairs: { variant: string; model: string }[] | null
  conversations: string[] | null
  questions: string[] | null
  backend: 'auto' | 'ballabot' | 'anthropic'
  limit: number | null
  concurrency: number
  outDir: string
  runDir: string | null
  help: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    mode: 'single',
    variants: Object.keys(TEACHER_VOICE_VARIANTS).filter(
      k => k !== 'approved-trim' && k !== 'approved-v1' && !k.startsWith('fix-')
    ),
    models: Object.keys(MODEL_IDS),
    pairs: null,
    conversations: null,
    questions: null,
    backend: 'auto',
    limit: null,
    concurrency: 3,
    outDir: path.join(REPO_ROOT, 'teacher-voice-output'),
    runDir: null,
    help: false,
  }
  for (const arg of argv) {
    const [flag, rawValue] = arg.split('=')
    const value = rawValue ?? ''
    switch (flag) {
      case '--help':
      case '-h':
        opts.help = true
        break
      case '--mode':
        if (value === 'single' || value === 'multiturn' || value === 'bookuse' || value === 'remeasure') opts.mode = value
        break
      case '--variants':
        opts.variants = value.split(',').map(s => s.trim()).filter(Boolean)
        break
      case '--models':
        opts.models = value.split(',').map(s => s.trim()).filter(Boolean)
        break
      case '--pairs':
        opts.pairs = value.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
          const [variant, model] = pair.split(':')
          return { variant, model }
        })
        break
      case '--conversations':
        opts.conversations = value.split(',').map(s => s.trim()).filter(Boolean)
        break
      case '--questions':
        opts.questions = value.split(',').map(s => s.trim()).filter(Boolean)
        break
      case '--backend':
        if (value === 'ballabot' || value === 'anthropic' || value === 'auto') opts.backend = value
        break
      case '--limit':
        opts.limit = Number(value)
        break
      case '--concurrency':
        opts.concurrency = Math.max(1, Number(value) || 1)
        break
      case '--out':
        opts.outDir = path.isAbsolute(value) ? value : path.join(REPO_ROOT, value)
        break
      case '--run':
        opts.runDir = path.isAbsolute(value) ? value : path.join(REPO_ROOT, value)
        break
      default:
        // ignore unknown flags rather than fail a long run over a typo
        break
    }
  }
  return opts
}

function printHelp() {
  console.log(`
Teacher-voice test runner

Options:
  --mode=single|multiturn|bookuse|remeasure   What to run (default: single)
  --variants=today,original,approved[,approved-trim]   Wording variants (default: today,original,approved)
  --models=balanced,deep               Which teacher depths to test (default: both)
  --pairs=variant:model,variant:model  Explicit variant/model pairs (multiturn mode; overrides --variants/--models)
  --backend=auto|ballabot|anthropic    Force a backend, or auto-detect (default: auto)
  --limit=N                            Cap the TOTAL number of model calls this run makes
  --concurrency=N                      Max calls in flight at once (default: 3)
  --out=<dir>                          Output directory (default: ./teacher-voice-output)
  --run=<dir>                          Existing run directory (remeasure mode)
  --help                                Show this help

Known variants: ${Object.keys(TEACHER_VOICE_VARIANTS).join(', ')} (approved-trim, approved-v1, and fix-* are experiments/historical — pass them explicitly)
Known models:   ${Object.keys(MODEL_IDS).join(', ')}
`)
}

// ---- Backend ------------------------------------------------------------

interface BackendResult {
  text: string
  seconds: number
  lookupCount: number
  consulted: boolean
  cutOff: boolean
  sawError: boolean
}

interface Backend {
  kind: 'ballabot' | 'anthropic'
  send: (system: string, messages: ChatMessage[], model: string) => Promise<BackendResult>
}

async function isBallabotReachable(): Promise<boolean> {
  const url = process.env.DHARMA_LLM_URL
  if (!url) return false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(url, { method: 'GET', signal: controller.signal }).catch(() => null)
    clearTimeout(timeout)
    // Any response at all (even a 404/401) means something is listening.
    return res !== null
  } catch {
    return false
  }
}

// Found the hard way during this task's fuller run: the SSH tunnel this app
// reaches Balla Bot's local service through died immediately after exactly
// one successful call completed — reproduced twice (after a 12s call and
// again after a 701s call), regardless of how long that call took. Not a
// retry-in-a-loop situation (the hard limit this task was given): this is
// ONE bounded reconnect attempt per call, only when the caller has opted in
// by setting DHARMA_LLM_TUNNEL_CMD (the exact command that reopens it — see
// this task's follow-up instructions). No env var set = no reconnect
// attempted = behaviour unchanged from before this fix.
async function ensureTunnel(): Promise<void> {
  const cmd = process.env.DHARMA_LLM_TUNNEL_CMD
  if (!cmd) return
  if (await isBallabotReachable()) return
  console.log('  [tunnel] unreachable — running DHARMA_LLM_TUNNEL_CMD to reopen it...')
  try {
    execSync(cmd, { stdio: 'ignore', timeout: 20000 })
  } catch (err) {
    console.log(`  [tunnel] reconnect command failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  // Give the forwarded port a moment to come up before the next request.
  await new Promise(resolve => setTimeout(resolve, 2000))
}

// The whole response body is already in hand here (no incremental streaming
// to handle in this script), so this is the one-shot convenience wrapper
// around the SAME parser src/app/(app)/teacher/page.tsx uses incrementally
// — see src/lib/teacher/stream-markers.ts for the shared implementation and
// its unit tests (including the marker-split-across-chunks case this task
// asked about).
function parseBallabotStream(raw: string): { text: string; lookupCount: number; sawDone: boolean; sawError: boolean } {
  const { text, markers } = parseMarkerStream(raw)
  return {
    text: text.trim(),
    lookupCount: markers.filter(m => m === LIBRARY_START).length,
    sawDone: markers.includes(STREAM_DONE),
    sawError: markers.includes(STREAM_ERROR),
  }
}

// A call can legitimately take a long time — a real "push for more detail"
// follow-up in this task's own dry run took 983s (~16 minutes) to finish
// normally, presumably a heavier multi-hop library session. But a dropped
// tunnel/connection must still fail loudly rather than hang forever, which
// is what actually happened during that same dry run (the SSH tunnel
// dropped mid-call and the fetch sat with nothing bounding it). 20 minutes
// comfortably covers the slowest observed real call while still catching a
// genuinely stuck connection.
//
// IMPORTANT: the AbortSignal must stay armed for the WHOLE request,
// including reading the streamed body via res.text() — fetch() itself only
// resolves once headers arrive, so clearing the timeout right after fetch()
// (an earlier bug here) left the slow, streamed body-read phase completely
// unbounded, which is exactly how that 983s call slipped past a
// too-early-cleared 4-minute timer undetected.
const BALLABOT_TIMEOUT_MS = 20 * 60 * 1000

function makeBallabotBackend(): Backend {
  const url = process.env.DHARMA_LLM_URL
  const token = process.env.DHARMA_LLM_TOKEN ?? ''

  async function attemptOnce(system: string, messages: ChatMessage[], model: string): Promise<BackendResult> {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), BALLABOT_TIMEOUT_MS)
    try {
      const res = await fetch(`${url}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ system, messages, max_tokens: MAX_TOKENS, stream_markers: true, model }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '')
        throw new Error(`dharma-llm responded ${res.status} ${detail.slice(0, 200)}`)
      }
      // Still under the same signal/timeout — this is the slow part.
      const raw = await res.text()
      const seconds = (Date.now() - start) / 1000
      const parsed = parseBallabotStream(raw)
      // Sanity check, found the hard way during this task's own dry run:
      // over a long call right after the SSH tunnel had dropped and been
      // reopened, the U+200B bytes framing a marker went missing in
      // transit, so parseBallabotStream had nothing to recognise and the
      // literal marker text ("dharma:library:start...") leaked straight
      // into the "answer". That would otherwise save silently as a short,
      // clean-looking reply with consulted=false — wrong on both counts.
      // Treat it as a failed call instead of bad data.
      if (/dharma:(library:(start|end)|done|error)/.test(parsed.text)) {
        throw new Error(
          `raw reply contained an unparsed dharma: marker — the stream likely dropped bytes in transit (tunnel hiccup during a ${Math.round(seconds)}s call). Not saved as data; retry this call.`
        )
      }
      return {
        text: parsed.text,
        seconds,
        lookupCount: parsed.lookupCount,
        consulted: parsed.lookupCount > 0,
        cutOff: !parsed.sawDone && !parsed.sawError,
        sawError: parsed.sawError,
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`dharma-llm call timed out after ${BALLABOT_TIMEOUT_MS / 1000}s (tunnel may have dropped)`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    kind: 'ballabot',
    async send(system, messages, model) {
      await ensureTunnel()
      try {
        return await attemptOnce(system, messages, model)
      } catch (err) {
        // ONE bounded recovery attempt, not a retry loop: only fires when
        // DHARMA_LLM_TUNNEL_CMD is set (see ensureTunnel above), and only
        // once per call.
        if (!process.env.DHARMA_LLM_TUNNEL_CMD) throw err
        console.log(`  [retry] first attempt failed (${err instanceof Error ? err.message : String(err)}) — reconnecting and retrying once...`)
        await ensureTunnel()
        return await attemptOnce(system, messages, model)
      }
    },
  }
}

function makeAnthropicBackend(): Backend {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return {
    kind: 'anthropic',
    async send(system, messages, model) {
      const start = Date.now()
      const response = await client.messages.create({ model, max_tokens: MAX_TOKENS, system, messages })
      const seconds = (Date.now() - start) / 1000
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
        .trim()
      return {
        text,
        seconds,
        lookupCount: 0, // direct API path has no library tool attached, same as route.ts's direct branch
        consulted: false,
        cutOff: response.stop_reason === 'max_tokens',
        sawError: false,
      }
    },
  }
}

async function selectBackend(opts: CliOptions): Promise<{ backend: Backend | null; note: string; paid: boolean }> {
  if (opts.backend === 'ballabot' || opts.backend === 'auto') {
    if (await isBallabotReachable()) {
      return { backend: makeBallabotBackend(), note: `Balla Bot route (${process.env.DHARMA_LLM_URL})`, paid: false }
    }
    if (opts.backend === 'ballabot') return { backend: null, note: 'Balla Bot route requested but unreachable', paid: false }
  }
  if (opts.backend === 'anthropic' || opts.backend === 'auto') {
    if (process.env.ANTHROPIC_API_KEY) {
      return { backend: makeAnthropicBackend(), note: 'Direct Anthropic API (paid)', paid: true }
    }
  }
  return { backend: null, note: '', paid: false }
}

// ---- Shared helpers -------------------------------------------------------

interface ReplyRecord {
  variant: string
  model: string
  modelId: string
  questionId: string
  questionLabel: string
  prompt: string
  backend: 'ballabot' | 'anthropic'
  replyText: string
  measures: ReplyMeasures
  seconds: number
  lookupCount: number
  consulted: boolean
  cutOff: boolean
  sawError: boolean
  timestamp: string
  error?: string
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}
function pct(n: number, of: number): string {
  if (of === 0) return 'n/a'
  return `${Math.round((n / of) * 100)}%`
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function runOne() {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runOne))
  return results
}

function summaryTableMarkdown(records: ReplyRecord[], variants: TeacherVoiceVariant[], models: { key: string }[]): string {
  const lines: string[] = []
  lines.push('| Variant | Model | Replies | Median words | Max words | % ending on a question | % headers | % lists/bold subheads | % consulted books | Median seconds | Banned-phrase hits |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const variant of variants) {
    for (const model of models) {
      const group = records.filter(r => r.variant === variant.key && r.model === model.key && !r.error)
      if (group.length === 0) continue
      const words = group.map(r => r.measures.wordCount)
      const endingQ = group.filter(r => r.measures.endsWithQuestionInLastParagraph).length
      const headers = group.filter(r => r.measures.hasMarkdownHeaders).length
      const lists = group.filter(r => r.measures.hasBulletsOrBoldSubheads).length
      const consulted = group.filter(r => r.consulted).length
      const seconds = group.map(r => r.seconds).filter(s => s > 0)
      const bannedHits = group.reduce((sum, r) => sum + r.measures.bannedPhraseHits.length, 0)
      lines.push(
        `| ${variant.key} | ${model.key} | ${group.length} | ${median(words)} | ${Math.max(...words)} | ${pct(endingQ, group.length)} | ${pct(headers, group.length)} | ${pct(lists, group.length)} | ${pct(consulted, group.length)} | ${seconds.length ? round1(median(seconds)) : 'n/a'} | ${bannedHits} |`
      )
    }
  }
  return lines.join('\n')
}

/**
 * The "does it sound like the model's default voice?" table (house-style
 * measures, added 21 Sep 2026 — see teacher-voice-measures.ts). Grouped by
 * variant/model as found in the records, so it works for any mode. When
 * `splitFollowUps` is set (multi-turn runs), first replies and follow-ups are
 * shown separately, because the complaint that prompted these measures was
 * about a follow-up reply.
 */
function houseStyleTableMarkdown(records: (ReplyRecord & { turnIndex?: number })[], splitFollowUps = false): string {
  const ok = records.filter(r => !r.error && r.measures.houseStyle)
  const keys = [...new Set(ok.map(r => `${r.variant}|${r.model}`))]
  const lines: string[] = []
  lines.push('| Variant | Model | Turns | Replies | Punchy fragments / reply | Signposts / reply | Concede-and-praise / reply | "The one that matters" stamps / reply | "Not X, it\'s Y" / reply | % opening "Ah" | % closing question about experience | Copied from examples |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  lines.push('| _old teacher, for reference_ | | | 50 | 1.1 | 0.1 | 0.1 | 0 | 0.5 | 48% | 64% | — |')
  const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
  for (const key of keys) {
    const [variant, model] = key.split('|')
    const all = ok.filter(r => r.variant === variant && r.model === model)
    const groups: [string, typeof all][] = splitFollowUps
      ? [['first', all.filter(r => (r.turnIndex ?? 1) === 1)], ['follow-ups', all.filter(r => (r.turnIndex ?? 1) > 1)]]
      : [['all', all]]
    for (const [label, group] of groups) {
      if (group.length === 0) continue
      const hs = group.map(r => r.measures.houseStyle)
      lines.push(
        `| ${variant} | ${model} | ${label} | ${group.length} | ${mean(hs.map(h => h.punchyFragments))} | ${mean(hs.map(h => h.signposts))} | ${mean(hs.map(h => h.concedeAndPraise))} | ${mean(hs.map(h => h.importanceStamps))} | ${mean(hs.map(h => h.contrasts))} | ${pct(hs.filter(h => h.opensWithAh).length, group.length)} | ${pct(hs.filter(h => h.closingQuestionAboutExperience).length, group.length)} | ${hs.filter(h => (h.exampleEchoes ?? []).length > 0).length} |`
      )
    }
  }
  return lines.join('\n')
}

function referencesToCheckMarkdown(records: ReplyRecord[]): string {
  const flagged = records.filter(r => !r.error && (r.measures.namesASource || r.measures.hasQuotationMarks))
  const lines: string[] = []
  lines.push('## References to check')
  lines.push('')
  lines.push('Every reply that named a teacher/book or used quotation marks. A quote with no library lookup is a red flag (books guidance says: verify the wording or say you can\'t).')
  lines.push('')
  if (flagged.length === 0) {
    lines.push('_None in this batch._')
    return lines.join('\n')
  }
  lines.push('| Variant | Model | Question/turn | Named a source | Quoted | Consulted the library | Red flag |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of flagged) {
    const redFlag = r.measures.hasQuotationMarks && !r.consulted ? '**YES — quoted without a lookup**' : ''
    lines.push(
      `| ${r.variant} | ${r.model} | ${r.questionLabel} | ${r.measures.namesASource} | ${r.measures.hasQuotationMarks} | ${r.consulted} (${r.lookupCount}) | ${redFlag} |`
    )
  }
  return lines.join('\n')
}

// ---- Mode: single ---------------------------------------------------------

async function runSingle(opts: CliOptions, backend: Backend, backendNote: string, paid: boolean) {
  const variants = opts.variants.map(getVariant)
  const models = opts.models.map(m => {
    const id = MODEL_IDS[m]
    if (!id) throw new Error(`Unknown model "${m}". Known models: ${Object.keys(MODEL_IDS).join(', ')}`)
    return { key: m, id }
  })

  type Job = { variant: TeacherVoiceVariant; model: { key: string; id: string }; question: TestQuestion }
  const questionPool = opts.questions ? TEST_QUESTIONS.filter(q => opts.questions!.includes(q.id)) : TEST_QUESTIONS
  let jobs: Job[] = []
  for (const question of questionPool) {
    for (const model of models) {
      for (const variant of variants) jobs.push({ variant, model, question })
    }
  }
  let effectiveLimit = opts.limit
  if (paid && effectiveLimit === null) effectiveLimit = 12
  if (effectiveLimit !== null && jobs.length > effectiveLimit) {
    console.log(`Trimming ${jobs.length} planned replies down to the ${effectiveLimit}-call limit.`)
    jobs = jobs.slice(0, effectiveLimit)
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = path.join(opts.outDir, runId)
  const repliesDir = path.join(runDir, 'replies')
  mkdirSync(repliesDir, { recursive: true })

  console.log(`[single] Running ${jobs.length} calls (concurrency ${opts.concurrency})...`)

  const records = await runWithConcurrency(jobs, opts.concurrency, async (job): Promise<ReplyRecord> => {
    const system = job.variant.buildFullSystem(INVENTED_BACKGROUND)
    const base = {
      variant: job.variant.key,
      model: job.model.key,
      modelId: job.model.id,
      questionId: job.question.id,
      questionLabel: job.question.label,
      prompt: job.question.prompt,
      backend: backend.kind,
      timestamp: new Date().toISOString(),
    }
    try {
      const result = await backend.send(system, [{ role: 'user', content: job.question.prompt }], job.model.id)
      const record: ReplyRecord = {
        ...base,
        replyText: result.text,
        measures: measureReply(result.text),
        seconds: result.seconds,
        lookupCount: result.lookupCount,
        consulted: result.consulted,
        cutOff: result.cutOff,
        sawError: result.sawError,
      }
      writeFileSync(path.join(repliesDir, `${record.variant}-${record.model}-${record.questionId}.json`), JSON.stringify(record, null, 2))
      console.log(`  ok    ${record.variant.padEnd(14)} ${record.model.padEnd(9)} ${record.questionId} (${round1(result.seconds)}s, lookups=${result.lookupCount})`)
      return record
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      const record: ReplyRecord = {
        ...base,
        replyText: '',
        measures: measureReply(''),
        seconds: 0,
        lookupCount: 0,
        consulted: false,
        cutOff: false,
        sawError: false,
        error,
      }
      writeFileSync(path.join(repliesDir, `${record.variant}-${record.model}-${record.questionId}.json`), JSON.stringify(record, null, 2))
      console.log(`  ERROR ${record.variant.padEnd(14)} ${record.model.padEnd(9)} ${record.questionId} — ${error}`)
      return record
    }
  })

  writeSingleReport(runDir, records, variants, models, backendNote)
  console.log(`\nWrote ${records.length} reply files to ${repliesDir}`)
  console.log(`Side-by-side markdown: ${path.join(runDir, 'side-by-side.md')}`)
}

function writeSingleReport(runDir: string, records: ReplyRecord[], variants: TeacherVoiceVariant[], models: { key: string }[], backendNote: string) {
  const summaryTable = summaryTableMarkdown(records, variants, models)
  console.log('\n' + summaryTable + '\n')

  const md: string[] = []
  md.push(`# Teacher voice — side-by-side (${path.basename(runDir)})`)
  md.push('')
  md.push(`Backend: ${backendNote}. Invented practitioner background only — see scripts/teacher-voice-fixtures.ts.`)
  md.push('')
  md.push('## Automatic measures')
  md.push('')
  md.push(summaryTable)
  md.push('')
  md.push('## House-style measures')
  md.push('')
  md.push(houseStyleTableMarkdown(records))
  md.push('')
  const errors = records.filter(r => r.error)
  if (errors.length) {
    md.push(`## Failures (${errors.length})`)
    md.push('')
    for (const e of errors) md.push(`- ${e.variant}/${e.model}/${e.questionId}: ${e.error}`)
    md.push('')
  }
  for (const question of TEST_QUESTIONS) {
    const anyForQuestion = records.some(r => r.questionId === question.id)
    if (!anyForQuestion) continue
    md.push(`## ${question.label}`)
    md.push('')
    md.push(`> ${question.prompt}`)
    md.push('')
    for (const model of models) {
      const anyForModel = records.some(r => r.questionId === question.id && r.model === model.key)
      if (!anyForModel) continue
      md.push(`### ${model.key}`)
      for (const variant of variants) {
        const record = records.find(r => r.variant === variant.key && r.model === model.key && r.questionId === question.id)
        md.push(`\n**${variant.key}** (${variant.description})`)
        if (!record) md.push('\n_not run this batch_')
        else if (record.error) md.push(`\n_error: ${record.error}_`)
        else {
          md.push(`\n${record.replyText}`)
          md.push(
            `\n<sub>${record.measures.wordCount} words · ${round1(record.seconds)}s · ends on question: ${record.measures.endsWithQuestionInLastParagraph} · headers: ${record.measures.hasMarkdownHeaders} · lists/bold subheads: ${record.measures.hasBulletsOrBoldSubheads} · consulted books: ${record.consulted} (${record.lookupCount}) · banned phrases: ${record.measures.bannedPhraseHits.join(', ') || 'none'}</sub>`
          )
        }
      }
      md.push('')
    }
  }
  md.push('')
  md.push(referencesToCheckMarkdown(records))
  const mdPath = path.join(runDir, 'side-by-side.md')
  writeFileSync(mdPath, md.join('\n'))

  const manifest = {
    runId: path.basename(runDir),
    mode: 'single',
    backend: backendNote,
    totalCalls: records.length,
    variants: variants.map(v => v.key),
    models: models.map(m => m.key),
  }
  writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

// ---- Mode: multiturn --------------------------------------------------------

type MultiturnRecord = ReplyRecord & { turnIndex: number; conversationId: string }

async function runMultiturn(opts: CliOptions, backend: Backend, backendNote: string) {
  const pairs = opts.pairs ?? opts.models.flatMap(m => opts.variants.map(v => ({ variant: v, model: m })))
  const resolvedPairs = pairs.map(p => ({ variant: getVariant(p.variant), model: { key: p.model, id: MODEL_IDS[p.model] } }))
  for (const p of resolvedPairs) {
    if (!p.model.id) throw new Error(`Unknown model "${p.model.key}"`)
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = path.join(opts.outDir, runId)
  const turnsDir = path.join(runDir, 'multiturn')
  mkdirSync(turnsDir, { recursive: true })

  const conversations = opts.conversations
    ? SCRIPTED_CONVERSATIONS.filter(c => opts.conversations!.includes(c.id))
    : SCRIPTED_CONVERSATIONS
  const jobs = resolvedPairs.flatMap(p => conversations.map(conv => ({ pair: p, conv })))
  console.log(`[multiturn] Running ${jobs.length} conversations (${jobs.reduce((s, j) => s + j.conv.userTurns.length, 0)} total turns), concurrency ${opts.concurrency}...`)

  const allRecords: MultiturnRecord[] = []

  const conversationResults = await runWithConcurrency(jobs, opts.concurrency, async ({ pair, conv }) => {
    // Background is attached every turn, but the SYSTEM STRING can now differ
    // by turn (fix-notes-turn: a quieter intro once the conversation already
    // has a teacher reply) — same `isFollowUpTurn` check the route uses,
    // recomputed each turn from the messages sent so far, so this test
    // reflects exactly what the app would send.
    const messages: ChatMessage[] = []
    const turnRecords: MultiturnRecord[] = []
    for (let i = 0; i < conv.userTurns.length; i++) {
      messages.push({ role: 'user', content: conv.userTurns[i] })
      const system = pair.variant.buildFullSystem(INVENTED_BACKGROUND, isFollowUpTurn(messages))
      const base = {
        variant: pair.variant.key,
        model: pair.model.key,
        modelId: pair.model.id,
        questionId: `${conv.id}#${i + 1}`,
        questionLabel: `${conv.label} — turn ${i + 1}`,
        prompt: conv.userTurns[i],
        backend: backend.kind,
        timestamp: new Date().toISOString(),
      }
      try {
        const result = await backend.send(system, messages, pair.model.id)
        messages.push({ role: 'assistant', content: result.text })
        const record = {
          ...base,
          replyText: result.text,
          measures: measureReply(result.text),
          seconds: result.seconds,
          lookupCount: result.lookupCount,
          consulted: result.consulted,
          cutOff: result.cutOff,
          sawError: result.sawError,
          turnIndex: i + 1,
          conversationId: conv.id,
        }
        turnRecords.push(record)
        console.log(`  ok    ${pair.variant.key}/${pair.model.key} ${conv.id} turn ${i + 1} (${round1(result.seconds)}s, lookups=${result.lookupCount})`)
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        console.log(`  ERROR ${pair.variant.key}/${pair.model.key} ${conv.id} turn ${i + 1} — ${error}`)
        turnRecords.push({
          ...base,
          replyText: '',
          measures: measureReply(''),
          seconds: 0,
          lookupCount: 0,
          consulted: false,
          cutOff: false,
          sawError: false,
          turnIndex: i + 1,
          conversationId: conv.id,
          error,
        })
        break // stop this conversation on failure rather than continuing on a broken transcript
      }
    }
    const fileName = `${pair.variant.key}-${pair.model.key}-${conv.id}.json`
    writeFileSync(path.join(turnsDir, fileName), JSON.stringify(turnRecords, null, 2))
    return turnRecords
  })

  for (const turnRecords of conversationResults) allRecords.push(...turnRecords)

  const md: string[] = []
  md.push(`# Teacher voice — multi-turn conversations (${runId})`)
  md.push('')
  md.push(`Backend: ${backendNote}. Invented practitioner + invented follow-ups only.`)
  md.push('')
  for (const p of resolvedPairs) {
    for (const conv of conversations) {
      const turns = allRecords.filter(r => r.variant === p.variant.key && r.model === p.model.key && r.conversationId === conv.id)
      if (turns.length === 0) continue
      md.push(`## ${p.variant.key} / ${p.model.key} — ${conv.label}`)
      md.push('')
      for (const t of turns) {
        md.push(`**Practitioner:** ${t.prompt}`)
        md.push('')
        if (t.error) md.push(`_error: ${t.error}_`)
        else {
          md.push(`**Teacher:** ${t.replyText}`)
          md.push('')
          md.push(`<sub>${t.measures.wordCount} words · ${round1(t.seconds)}s · ends on question: ${t.measures.endsWithQuestionInLastParagraph} · consulted books: ${t.consulted} (${t.lookupCount}) · banned phrases: ${t.measures.bannedPhraseHits.join(', ') || 'none'} · fragments ${t.measures.houseStyle.punchyFragments} · signposts ${t.measures.houseStyle.signposts} · concede ${t.measures.houseStyle.concedeAndPraise} · stamps ${t.measures.houseStyle.importanceStamps} · contrasts ${t.measures.houseStyle.contrasts} · Ah ${t.measures.houseStyle.opensWithAh} · closing q about experience ${t.measures.houseStyle.closingQuestionAboutExperience}</sub>`)
        }
        md.push('')
      }
    }
  }
  md.push('')
  const houseStyle = houseStyleTableMarkdown(allRecords, true)
  console.log('\n' + houseStyle + '\n')
  md.push('## House-style measures')
  md.push('')
  md.push(houseStyle)
  md.push('')
  md.push(referencesToCheckMarkdown(allRecords))
  const mdPath = path.join(runDir, 'multiturn.md')
  writeFileSync(mdPath, md.join('\n'))
  writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify({ runId, mode: 'multiturn', backend: backendNote, pairs: resolvedPairs.map(p => `${p.variant.key}:${p.model.key}`) }, null, 2))

  console.log(`\nWrote ${conversationResults.length} conversations to ${turnsDir}`)
  console.log(`Multi-turn markdown: ${mdPath}`)
}

// ---- Mode: bookuse ----------------------------------------------------------

async function runBookuse(opts: CliOptions, backend: Backend, backendNote: string) {
  const variantKey = opts.variants[0] ?? 'approved'
  const modelKey = opts.models[0] ?? 'balanced'
  const variant = getVariant(variantKey)
  const modelId = MODEL_IDS[modelKey]
  if (!modelId) throw new Error(`Unknown model "${modelKey}"`)

  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = path.join(opts.outDir, runId)
  const turnsDir = path.join(runDir, 'bookuse')
  mkdirSync(turnsDir, { recursive: true })

  console.log(`[bookuse] Running ${LIBRARY_MATRIX_TURNS.length} turns on ${variantKey}/${modelKey}, no background, concurrency ${opts.concurrency}...`)

  interface BookUseRecord {
    id: string
    group: LibraryMatrixTurn['group']
    label: string
    replyText: string
    measures: ReplyMeasures
    consulted: boolean
    lookupCount: number
    seconds: number
    error?: string
  }

  const records = await runWithConcurrency(LIBRARY_MATRIX_TURNS, opts.concurrency, async (turn): Promise<BookUseRecord> => {
    try {
      const result = await backend.send(variant.systemPromptOnly, turn.messages, modelId)
      const record: BookUseRecord = {
        id: turn.id,
        group: turn.group,
        label: turn.label,
        replyText: result.text,
        measures: measureReply(result.text),
        consulted: result.consulted,
        lookupCount: result.lookupCount,
        seconds: result.seconds,
      }
      writeFileSync(path.join(turnsDir, `${turn.id}.json`), JSON.stringify(record, null, 2))
      console.log(`  ok    [${turn.group}] ${turn.id} consulted=${result.consulted} (${round1(result.seconds)}s)`)
      return record
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      const record: BookUseRecord = { id: turn.id, group: turn.group, label: turn.label, replyText: '', measures: measureReply(''), consulted: false, lookupCount: 0, seconds: 0, error }
      writeFileSync(path.join(turnsDir, `${turn.id}.json`), JSON.stringify(record, null, 2))
      console.log(`  ERROR [${turn.group}] ${turn.id} — ${error}`)
      return record
    }
  })

  const everyday = records.filter(r => r.group === 'everyday')
  const lookup = records.filter(r => r.group === 'lookup')
  const judgement = records.filter(r => r.group === 'judgement')
  const everydayZeroCalls = everyday.filter(r => !r.consulted).length
  const lookupHits = lookup.filter(r => r.consulted && r.measures.namesASource).length
  const violations = records.filter(r => r.measures.bannedPhraseHits.length > 0)

  const md: string[] = []
  md.push(`# Teacher voice — book-use batch (${runId})`)
  md.push('')
  md.push(`Variant: ${variantKey} · Model: ${modelKey} · Backend: ${backendNote} · No practitioner background (matches balla-bot's own test).`)
  md.push('')
  md.push(`- Everyday turns that made ZERO library calls: ${everydayZeroCalls}/${everyday.length} (balla-bot's own bar: >= 9/10)`)
  md.push(`- Lookup turns that consulted AND named a real source: ${lookupHits}/${lookup.length} (balla-bot's own bar: at most 1 miss)`)
  md.push(`- Judgement turns (open doctrine — owner has now decided these SHOULD consult): ${judgement.filter(r => r.consulted).length}/${judgement.length} consulted`)
  md.push(`- Banned-phrase / broke-character violations: ${violations.length}`)
  md.push('')
  for (const group of ['everyday', 'lookup', 'judgement'] as const) {
    md.push(`## ${group}`)
    md.push('')
    md.push('| Turn | Consulted | Lookups | Named source | Words | Seconds | Banned phrases |')
    md.push('|---|---|---|---|---|---|---|')
    for (const r of records.filter(x => x.group === group)) {
      md.push(`| ${r.label} | ${r.consulted} | ${r.lookupCount} | ${r.measures.namesASource} | ${r.measures.wordCount} | ${round1(r.seconds)} | ${r.measures.bannedPhraseHits.join(', ') || 'none'} |`)
    }
    md.push('')
  }
  const mdPath = path.join(runDir, 'book-use.md')
  writeFileSync(mdPath, md.join('\n'))
  writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify({ runId, mode: 'bookuse', backend: backendNote, variant: variantKey, model: modelKey }, null, 2))

  console.log(`\nEveryday zero-call: ${everydayZeroCalls}/${everyday.length}. Lookup hits: ${lookupHits}/${lookup.length}. Violations: ${violations.length}.`)
  console.log(`Book-use markdown: ${mdPath}`)
}

// ---- Mode: remeasure --------------------------------------------------------

function remeasureFile(filePath: string): { updated: number } {
  const raw = readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  let updated = 0
  const remeasureOne = (obj: unknown): void => {
    if (obj && typeof obj === 'object' && 'replyText' in obj) {
      const rec = obj as { replyText: string; measures?: ReplyMeasures }
      rec.measures = measureReply(rec.replyText ?? '')
      updated++
    }
  }
  if (Array.isArray(data)) data.forEach(remeasureOne)
  else remeasureOne(data)
  writeFileSync(filePath, JSON.stringify(data, null, 2))
  return { updated }
}

async function runRemeasure(opts: CliOptions) {
  if (!opts.runDir) throw new Error('remeasure mode needs --run=<dir>')
  const runDir = opts.runDir
  const subdirs = ['replies', 'multiturn', 'bookuse'].map(d => path.join(runDir, d)).filter(d => {
    try {
      return statSync(d).isDirectory()
    } catch {
      return false
    }
  })
  if (subdirs.length === 0) throw new Error(`No replies/multiturn/bookuse directory found under ${runDir}`)

  let totalUpdated = 0
  let totalFiles = 0
  for (const dir of subdirs) {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      const { updated } = remeasureFile(path.join(dir, file))
      totalUpdated += updated
      totalFiles++
    }
  }
  console.log(`Re-measured ${totalUpdated} replies across ${totalFiles} files under ${runDir}.`)

  // Print the house-style table over everything in the run (any mode), so an
  // old run can be scored on these measures without new model calls.
  const everything = subdirs.flatMap(dir =>
    readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .flatMap(f => {
        const data = JSON.parse(readFileSync(path.join(dir, f), 'utf-8'))
        return (Array.isArray(data) ? data : [data]).filter(r => r && typeof r === 'object' && 'replyText' in r && 'variant' in r)
      })
  ) as (ReplyRecord & { turnIndex?: number })[]
  if (everything.length) console.log('\n' + houseStyleTableMarkdown(everything, everything.some(r => r.turnIndex !== undefined)) + '\n')

  // If this looks like a single-turn run, also regenerate its summary table + side-by-side.md.
  const repliesDir = path.join(runDir, 'replies')
  try {
    if (statSync(repliesDir).isDirectory()) {
      const records: ReplyRecord[] = readdirSync(repliesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(readFileSync(path.join(repliesDir, f), 'utf-8')))
      const variantKeys = [...new Set(records.map(r => r.variant))]
      const modelKeys = [...new Set(records.map(r => r.model))]
      const variants = variantKeys.map(getVariant)
      const models = modelKeys.map(key => ({ key }))
      let backendNote = records[0]?.backend ?? 'unknown'
      try {
        const manifest = JSON.parse(readFileSync(path.join(runDir, 'manifest.json'), 'utf-8'))
        backendNote = manifest.backend ?? backendNote
      } catch {
        // manifest missing/unreadable — fall back to the backend field on a reply
      }
      writeSingleReport(runDir, records, variants, models, backendNote)
      console.log(`Regenerated ${path.join(runDir, 'side-by-side.md')}`)
    }
  } catch {
    // no replies/ dir — nothing to regenerate
  }
}

// ---- Main -----------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  if (opts.mode === 'remeasure') {
    await runRemeasure(opts)
    return
  }

  const { backend, note: backendNote, paid } = await selectBackend(opts)
  if (!backend) {
    console.error(`
No reachable backend. Nothing was run — no results were faked.

What's missing:
  - Balla Bot route: DHARMA_LLM_URL is ${process.env.DHARMA_LLM_URL ? `set to ${process.env.DHARMA_LLM_URL}, but nothing answered on it` : 'not set'}.
  - Direct Anthropic API: ANTHROPIC_API_KEY is ${process.env.ANTHROPIC_API_KEY ? 'set' : 'not set'}.
`)
    process.exitCode = 1
    return
  }

  console.log(`Backend: ${backendNote}`)
  if (paid) console.log('Using the direct, PAID Anthropic API. Calls are capped unless --limit is raised.')

  if (opts.mode === 'single') await runSingle(opts, backend, backendNote, paid)
  else if (opts.mode === 'multiturn') await runMultiturn(opts, backend, backendNote)
  else if (opts.mode === 'bookuse') await runBookuse(opts, backend, backendNote)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
