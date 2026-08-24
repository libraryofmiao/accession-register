import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url) throw new Error("SUPABASE_URL is not configured.");
if (!publishableKey) throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured.");
if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not configured.");

export const supabasePublic = createClient(url, publishableKey);
export const supabaseAdmin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
