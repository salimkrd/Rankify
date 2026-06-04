import { supabase } from "../lib/supabaseClient.js";

export async function getCurrentAdminUser() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("id,user_id,email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? user : null;
}

export async function signInAdmin(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    await supabase.auth.signOut();
    throw new Error("This account is not authorized for Rankify admin.");
  }

  return adminUser;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

