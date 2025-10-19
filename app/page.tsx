// app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'

type Hackathon = {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
}

export default function Home() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('/api/test-supabase')
        if (res.data.ok) setHackathons(res.data.rows)
      } catch (err) {
        console.error('Failed to load hackathons:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">
        XCollab — Upcoming Hackathons
      </h1>

      {loading && <p>Loading…</p>}

      {!loading && hackathons.length === 0 && (
        <p>No hackathons found.</p>
      )}

      <div className="grid gap-4">
        {hackathons.map((h) => (
          <Link
            key={h.id}
            href={`/hackathon/${h.id}`}
            className="block border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {h.title}
            </h2>
            <p className="text-sm text-gray-600">{h.description}</p>
            <p className="text-sm mt-2 text-gray-700">
              {new Date(h.start_date).toLocaleDateString()} –{' '}
              {new Date(h.end_date).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
