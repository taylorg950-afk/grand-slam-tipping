'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { parseDrawPdf, saveDrawMatches } from './actions'
import type { ParsedDraw } from './actions'
import { use } from 'react'

export default function ImportDrawPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)

  const [parsed, setParsed] = useState<ParsedDraw | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isParsing, startParsing] = useTransition()
  const [isSaving, startSaving] = useTransition()

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startParsing(async () => {
      const result = await parseDrawPdf(formData)
      if (result.ok) {
        setParsed(result.data)
      } else {
        setError(result.error)
      }
    })
  }

  function handleSave() {
    if (!parsed) return
    startSaving(async () => {
      const result = await saveDrawMatches(slug, parsed.draw, parsed.rounds)
      if (result.ok) {
        setSaved(true)
      } else {
        setError(result.error ?? 'Save failed.')
      }
    })
  }

  const totalMatches = parsed?.rounds.reduce((n, r) => n + r.matches.length, 0) ?? 0

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/admin/tournaments/${slug}/rounds`} className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          ← Back to rounds
        </Link>
        <h1 className="mt-2 font-serif text-[22px] font-bold uppercase tracking-[0.04em]">Import draw from PDF</h1>
        <p className="text-sm text-[var(--ink-3)] mt-1">
          Drop in the official draw PDF. Claude will extract all matches — check the preview before saving.
        </p>
      </div>

      {saved ? (
        <div className="rounded-lg border border-[var(--rule)] bg-[var(--brick-surface)] p-4 text-sm text-[var(--olive)]">
          {totalMatches} matches imported successfully.{' '}
          <Link href={`/admin/tournaments/${slug}/rounds`} className="font-medium underline">
            Back to rounds →
          </Link>
        </div>
      ) : (
        <>
          {/* Upload form */}
          {!parsed && (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="pdf" className="text-sm font-medium text-[var(--ink-2)]">
                  Draw PDF
                </label>
                <input
                  id="pdf"
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  required
                  className="block w-full text-sm text-[var(--ink-2)] file:mr-4 file:rounded-md file:border file:border-[var(--rule)] file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-[var(--ink-2)] hover:file:bg-[var(--paper)]"
                />
              </div>

              {error && <p className="text-sm text-[var(--down)]">{error}</p>}

              <button
                type="submit"
                disabled={isParsing}
                className="tp-cta disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isParsing ? 'Reading draw…' : 'Parse draw'}
              </button>
            </form>
          )}

          {/* Preview */}
          {parsed && !saved && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-[var(--ink-2)]">
                    {parsed.draw === 'mens' ? "Men's" : "Women's"} singles —{' '}
                    {totalMatches} matches across {parsed.rounds.length} rounds
                  </span>
                </div>
                <button
                  onClick={() => { setParsed(null); setError('') }}
                  className="text-sm text-[var(--ink-3)] hover:text-[var(--ink-2)]"
                >
                  Try again
                </button>
              </div>

              {error && <p className="text-sm text-[var(--down)]">{error}</p>}

              <div className="space-y-4">
                {parsed.rounds.map(round => (
                  <div key={round.name} className="rounded-lg border border-[var(--rule)] bg-white overflow-hidden">
                    <div className="px-4 py-2 bg-[var(--paper)] border-b border-[var(--rule)] flex items-center justify-between">
                      <span className="text-sm font-medium">{round.name}</span>
                      <span className="text-xs text-[var(--ink-3)]">{round.matches.length} matches</span>
                    </div>
                    <div className="divide-y divide-[var(--paper-3)]">
                      {[...round.matches]
                        .sort((a, b) => a.position - b.position)
                        .map(match => (
                          <div key={match.position} className="flex items-center gap-3 px-4 py-2 text-sm">
                            <span className="w-5 text-xs text-[var(--ink-3)] tabular-nums">{match.position + 1}</span>
                            <span className="flex-1 text-[var(--ink-2)]">{match.player1}</span>
                            <span className="text-xs text-[var(--ink-3)]">vs</span>
                            <span className="flex-1 text-[var(--ink-2)] text-right">{match.player2}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="tp-cta disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : `Import ${totalMatches} matches`}
                </button>
                <button
                  onClick={() => { setParsed(null); setError('') }}
                  className="rounded-md border border-[var(--rule)] px-4 py-2 text-sm text-[var(--ink-2)] hover:bg-[var(--paper)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
