import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error(
        '[FloatChat] Missing Supabase env vars.\n' +
        'Create frontend/.env.local and add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
