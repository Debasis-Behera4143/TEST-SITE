// Supabase Client Wrapper (Dual Live/Demo Mode Router)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLiveMode = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== "YOUR_SUPABASE_URL");

let supabaseInstance = null;

if (isLiveMode) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log("%c[EduTrack AI]: Connected to Live Supabase Backend!", "color: #06b6d4; font-weight: bold;");
  } catch (error) {
    console.error("[EduTrack AI]: Failed to initialize Supabase client: ", error);
  }
} else {
  console.log("%c[EduTrack AI]: Missing API keys. Running in premium Local Demo Mode (localStorage relational DB engine).", "color: #a855f7; font-weight: bold; font-size: 11px;");
}

export const supabase = supabaseInstance;
export default supabase;
