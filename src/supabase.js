import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qblfhpmacbhikwdspylk.supabase.co'
const supabaseAnonKey = 'sb_publishable_doGvlR-B_3sKSarflo_rWA_t21IViav'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)