import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Custom fetch to globally intercept auth errors (401)
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const response = await fetch(url, options)
  
  if (response.status === 401) {
    // Only dispatch on 401 (Unauthorized/Expired). 403 (Forbidden) is an RLS issue, not a session issue.
    window.dispatchEvent(new CustomEvent('supabase:auth-error', { 
        detail: { status: response.status } 
    }))
  }
  
  return response
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: customFetch
  }
})
