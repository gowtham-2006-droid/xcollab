'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

type Hackathon = {
  id: string
  title: string
  description: string
  tracks: string[]
  start_date: string
  end_date: string
  min_team_size?: number
  max_team_size?: number
}

type Idea = {
  title?: string
  short_desc?: string
  stack?: string[]
  roadmap?: string[]
} | string

export default function HackathonPageClient() {
  const params = useParams() as Record<string, string>;
  const id = params?.id ?? '';

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)

  const [ideasRaw, setIdeasRaw] = useState<string>('') // for debug text
  const [ideasParsed, setIdeasParsed] = useState<Idea[] | null>(null)
  const [loadingIdeas, setLoadingIdeas] = useState(false)

  const [proposalInput, setProposalInput] = useState('')
  const [proposalOutput, setProposalOutput] = useState<string>('')

  const [loadingProposal, setLoadingProposal] = useState(false)
  const [matchInputIds, setMatchInputIds] = useState('')
  const [matchTeams, setMatchTeams] = useState<any[] | null>(null)
  const [loadingMatch, setLoadingMatch] = useState(false)
  const [error, setError] = useState<string | null>(null)

  let lastProposalTime = 0

  // -------- Load Hackathon --------
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    axios
      .get(`/api/hackathons/${id}`)
      .then((res) => {
        if (res.data?.ok && res.data.hackathon) {
          const h = res.data.hackathon
          setHackathon({
            id: h.id,
            title: h.title,
            description: h.description,
            tracks: h.tracks || [],
            start_date: h.start_date,
            end_date: h.end_date,
            min_team_size: h.min_team_size,
            max_team_size: h.max_team_size,
          })
        } else setError('Hackathon not found.')
      })
      .catch(() => setError('Failed to load hackathon.'))
      .finally(() => setLoading(false))
  }, [id])

  // -------- Generate Ideas --------
  async function generateIdeas() {
    if (!hackathon) return
    setError(null)
    setLoadingIdeas(true)
    setIdeasRaw('')
    setIdeasParsed(null)

    try {
      const res = await axios.post('/api/ai/idea', {
        track: hackathon.tracks?.[0] || 'General',
        skills: ['react', 'python'],
        interests: ['AI', 'collaboration'],
      })

      const out = res.data.output
      let parsed: any = null

      if (typeof out === 'string') {
        setIdeasRaw(out)
        try {
          const tryJSON = JSON.parse(out)
          parsed = Array.isArray(tryJSON)
            ? tryJSON
            : tryJSON.choices?.[0]?.message?.content || null
        } catch {
          parsed = null
        }
      } else {
        parsed = out
      }

      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch {
          parsed = [parsed]
        }
      }

      if (!Array.isArray(parsed)) parsed = [parsed]
      setIdeasParsed(parsed)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Idea generation failed')
    } finally {
      setLoadingIdeas(false)
    }
  }

  // -------- Draft Proposal --------
  async function draftProposal(ideaText: string | null) {
    const now = Date.now()
    if (now - lastProposalTime < 25000) {
      setError('Wait at least 25 seconds before requesting another proposal.')
      return
    }
    lastProposalTime = now

    if (!ideaText && !proposalInput) {
      setError('Provide an idea or paste idea text to draft a proposal.')
      return
    }
    setError(null)
    setLoadingProposal(true)
    setProposalOutput('')

    try {
      const res = await axios.post('/api/ai/proposal', {
        idea: ideaText || proposalInput,
        team: [],
      })
      setProposalOutput(
        res.data.proposal ||
          res.data.proposalText ||
          JSON.stringify(res.data)
      )
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Proposal generation failed')
    } finally {
      setLoadingProposal(false)
    }
  }

  // -------- Team Match --------
  async function runMatch() {
    const raw = matchInputIds.trim()
    if (!raw) return setError('Enter comma-separated student user_ids.')
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!ids.length) return setError('No valid user ids provided.')

    setError(null)
    setLoadingMatch(true)
    setMatchTeams(null)

    try {
      const res = await axios.post('/api/ai/match', {
        poolUserIds: ids,
        teamSize: hackathon?.max_team_size || 3,
      })
      setMatchTeams(res.data.teams || [])
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Team match failed')
    } finally {
      setLoadingMatch(false)
    }
  }

  // -------- Render --------
  if (loading) return <p className="p-6">Loading hackathon…</p>
  if (error)
    return (
      <main className="p-6">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <a href="/" className="text-blue-600">Back to home</a>
      </main>
    )
  if (!hackathon)
    return (
      <main className="p-6">
        <h2 className="text-xl font-semibold">Hackathon not found</h2>
        <p className="text-sm text-gray-600">
          Use <a href="/" className="text-blue-600">Home</a> to pick another hackathon.
        </p>
      </main>
    )

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">{hackathon.title}</h1>
      <p className="text-gray-700 mb-4">{hackathon.description}</p>
      <p className="text-sm text-gray-600 mb-4">
        {new Date(hackathon.start_date).toLocaleDateString()} –{' '}
        {new Date(hackathon.end_date).toLocaleDateString()}
      </p>

      {/* ---------- Ideas ---------- */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI: Generate Project Ideas</h2>
        <div className="flex gap-2 mb-3">
          <button
            onClick={generateIdeas}
            className="bg-blue-600 text-white px-3 py-2 rounded"
            disabled={loadingIdeas}
          >
            {loadingIdeas ? 'Generating…' : 'Generate Ideas'}
          </button>
          <button
            onClick={() => {
              setIdeasRaw('')
              setIdeasParsed(null)
            }}
            className="bg-gray-200 px-3 py-2 rounded"
          >
            Clear
          </button>
        </div>

        {Array.isArray(ideasParsed) ? (
          <div className="space-y-3">
            {ideasParsed.map((it: any, idx: number) => (
              <div key={idx} className="p-3 border rounded">
                {typeof it === 'string' ? (
                  <pre className="whitespace-pre-wrap text-sm">{it}</pre>
                ) : (
                  <>
                    <div className="font-semibold">
                      {it.title || `(idea ${idx + 1})`}
                    </div>
                    {it.short_desc && (
                      <div className="text-sm text-gray-700 mt-1">
                        {it.short_desc}
                      </div>
                    )}
                    {it.stack && (
                      <div className="text-xs text-gray-600 mt-2">
                        Stack: {it.stack.join(', ')}
                      </div>
                    )}
                    {it.roadmap && Array.isArray(it.roadmap) && (
                      <ul className="text-xs mt-2 list-disc pl-5">
                        {it.roadmap.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          draftProposal(
                            typeof it === 'string'
                              ? it
                              : it.short_desc || it.title || ''
                          )
                        }
                        className="text-sm bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Draft Proposal from this idea
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          ideasRaw && (
            <pre className="mt-3 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
              {ideasRaw}
            </pre>
          )
        )}
      </section>

      {/* ---------- Proposal ---------- */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI: Draft Proposal</h2>
        <textarea
          className="w-full p-2 border rounded mb-2"
          placeholder="Paste idea text here or click Draft from idea above"
          value={proposalInput}
          onChange={(e) => setProposalInput(e.target.value)}
          rows={4}
        />
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => draftProposal(null)}
            className="bg-indigo-600 text-white px-3 py-2 rounded"
            disabled={loadingProposal}
          >
            {loadingProposal ? 'Drafting…' : 'Draft Proposal'}
          </button>
          <button
            onClick={() => {
              setProposalInput('')
              setProposalOutput('')
            }}
            className="bg-gray-200 px-3 py-2 rounded"
          >
            Clear
          </button>
        </div>

        {proposalOutput && (
          <div className="p-3 bg-gray-50 rounded text-sm prose max-w-none">
            <ReactMarkdown>{proposalOutput}</ReactMarkdown>
          </div>
        )}
      </section>

      {/* ---------- Team Formation ---------- */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI: Team Formation</h2>
        <p className="text-xs text-gray-600 mb-2">
          Paste comma-separated `student_profiles.user_id` values to form teams.
        </p>
        <textarea
          className="w-full p-2 border rounded mb-2"
          placeholder="comma separated user ids"
          value={matchInputIds}
          onChange={(e) => setMatchInputIds(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2 mb-3">
          <button
            onClick={runMatch}
            className="bg-emerald-600 text-white px-3 py-2 rounded"
            disabled={loadingMatch}
          >
            {loadingMatch ? 'Matching…' : 'Run Team Match'}
          </button>
          <button
            onClick={() => {
              setMatchInputIds('')
              setMatchTeams(null)
            }}
            className="bg-gray-200 px-3 py-2 rounded"
          >
            Clear
          </button>
        </div>

        {matchTeams &&
          (matchTeams.length === 0 ? (
            <div className="text-sm text-gray-600">No teams suggested.</div>
          ) : (
            <div className="space-y-3">
              {matchTeams.map((t: any, i: number) => (
                <div key={i} className="p-3 border rounded">
                  <div className="font-semibold">Team {i + 1}</div>
                  <div className="text-sm font-mono mt-1">
                    {(t.members || []).join(', ')}
                  </div>
                  {t.reason && (
                    <div className="text-xs text-gray-600 mt-2">
                      Reason: {t.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
      </section>
    </main>
  )
}
