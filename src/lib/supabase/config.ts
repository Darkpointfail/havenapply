/** Which data backend the app uses. Default: localStorage prototype. */
export function dataBackend(): "local" | "supabase" {
  const v = process.env.NEXT_PUBLIC_DATA_BACKEND;
  return v === "supabase" ? "supabase" : "local";
}

export function isSupabaseBackend() {
  return dataBackend() === "supabase";
}
