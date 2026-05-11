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
        <Link href={`/admin/tournaments/${slug}/rounds`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to rounds
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Import draw from PDF</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Drop in the official draw PDF. Claude will extract all matches — check the preview before saving.
        </p>
      </div>

      {saved ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
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
                <label htmlFor="pdf" className="text-sm font-medium text-zinc-700">
                  Draw PDF
                </label>
                <input
                  id="pdf"
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  required
                  className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-zinc-700 hover:file:bg-zinc-50"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isParsing}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
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
                  <span className="text-sm font-medium text-zinc-700">
                    {parsed.draw === 'mens' ? "Men's" : "Women's"} singles —{' '}
                    {totalMatches} matches across {parsed.rounds.length} rounds
                  </span>
                </div>
                <button
                  onClick={() => { setParsed(null); setError('') }}
                  className="text-sm text-zinc-400 hover:text-zinc-700"
                >
                  Try again
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="space-y-4">
                {parsed.rounds.map(round => (
                  <div key={round.name} className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                      <span className="text-sm font-medium">{round.name}</span>
                      <span className="text-xs text-zinc-400">{round.matches.length} matches</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {[...round.matches]
                        .sort((a, b) => a.position - b.position)
                        .map(match => (
                          <div key={match.position} className="flex items-center gap-3 px-4 py-2 text-sm">
                            <span className="w-5 text-xs text-zinc-400 tabular-nums">{match.position + 1}</span>
                            <span className="flex-1 text-zinc-700">{match.player1}</span>
                            <span className="text-xs text-zinc-400">vs</span>
                            <span className="flex-1 text-zinc-700 text-right">{match.player2}</span>
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
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : `Import ${totalMatches} matches`}
                </button>
                <button
                  onClick={() => { setParsed(null); setError('') }}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
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
