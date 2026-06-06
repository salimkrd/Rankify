import { supabase } from "../lib/supabaseClient.js";

export async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("Please sign in again to continue.");
  try {
    const storedUser = JSON.parse(localStorage.getItem("rankify_user") || "null");
    localStorage.setItem(
      "rankify_user",
      JSON.stringify({
        ...(storedUser && typeof storedUser === "object" ? storedUser : {}),
        id: user.id,
        email: user.email || storedUser?.email || "",
      })
    );
  } catch {
    localStorage.setItem("rankify_user", JSON.stringify({ id: user.id, email: user.email || "" }));
  }
  return user.id;
}

export function formatSupabaseDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

export async function runSupabaseQuery(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
