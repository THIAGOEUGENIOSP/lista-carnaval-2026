// ✅ Coloque aqui a URL e a ANON KEY do seu projeto Supabase
// Supabase Dashboard -> Project Settings -> API

export const SUPABASE_URL = "https://wwlacqtuycsbajdunbyl.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bGFjcXR1eWNzYmFqZHVuYnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1MDAsImV4cCI6MjA4NDM0ODUwMH0.tQSxDzRbFN8BnAdkEExCwWJ-cSKuCEzWtaeOpM-uCJ0";

export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
