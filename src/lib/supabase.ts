import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// 서버 전용 Supabase 클라이언트 (service role key, lazy 초기화)
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _supabase
}

export const STORAGE_BUCKET = "work-record-images"
