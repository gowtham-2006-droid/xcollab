// pages/api/hackathons/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'  // <- fixed path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  try {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Not found' })

    return res.status(200).json({ ok: true, hackathon: data })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) })
  }
}
