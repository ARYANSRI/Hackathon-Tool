import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secretKey = process.env.SUPABASE_SECRET_KEY!

  if (!supabaseUrl || !secretKey) {
    throw new Error('Missing Supabase URL or Secret Key for Admin Client.')
  }

  return createSupabaseClient<any>(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
