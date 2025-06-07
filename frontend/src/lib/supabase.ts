import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nihdnnaixxtndvddgoel.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGRubmFpeHh0bmR2ZGRnb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODEyNjUsImV4cCI6MjA2NDc1NzI2NX0.R10U6v7FdPU8wNbstBvClK-EAYhZm7B2oeRCvbRREEs";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: "supabase.auth.token",
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
