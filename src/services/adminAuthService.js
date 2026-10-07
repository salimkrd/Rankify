import { firebaseClient } from "../lib/firebaseClient.js";

export async function getCurrentAdminUser() {
  const {
    data: { user },
    error: userError,
  } = await firebaseClient.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await firebaseClient
    .from("admin_users")
    .select("id,user_id,email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? user : null;
}

export async function signInAdmin(email, password) {
  const { error } = await firebaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    await firebaseClient.auth.signOut();
    throw new Error("This account is not authorized for Rankify admin.");
  }

  return adminUser;
}

export async function signOutAdmin() {
  const { error } = await firebaseClient.auth.signOut();
  if (error) throw error;
}
