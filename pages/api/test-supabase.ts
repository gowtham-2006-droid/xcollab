import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase.from('hackathons').select('*').limit(5)
    if (error) return res.status(500).json({ ok: false, error: error.message })
    return res.status(200).json({ ok: true, rows: data })
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || err })
  }
}
