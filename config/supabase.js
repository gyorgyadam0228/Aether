import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

// Server-side: prefer service role so RLS won't block inserts/updates.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

export const supabase = createClient(process.env.SUPABASE_URL, supabaseKey)
