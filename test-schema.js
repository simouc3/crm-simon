import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function getCols() {
  const { data, error } = await supabase.from('deals').select('*').limit(1)
  console.log(data ? Object.keys(data[0] || {}) : error)
}

getCols()
