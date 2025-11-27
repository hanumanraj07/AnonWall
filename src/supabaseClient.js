import { createClient } from "@supabase/supabase-js";

// ⬇️ Replace these two values with your real Supabase keys
const SUPABASE_URL = "https://cftgazmiiklydjbwrbgr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdGdhem1paWtseWRqYndyYmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDYzMDcsImV4cCI6MjA3OTgyMjMwN30.5Qegp3NUAseKIVziXIljYftsvBfBep5QHZtzdEDEOcw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
