import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { db, auth } from "./firebase.js";

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function cleanPayload(data) {
  if (!data || typeof data !== "object") return data;
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function docToRow(snapshot) {
  const data = snapshot.data() || {};
  return {
    ...data,
    id: data.id || snapshot.id,
  };
}

class FirestoreQueryBuilder {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filters = [];
    this.orderBys = [];
    this.limitCount = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.countMode = false;
    this.operation = "select"; // 'select' | 'insert' | 'update' | 'delete'
    this.pendingInsertRows = null;
    this.pendingUpdatePatch = null;
  }

  select(columns = "*", options = {}) {
    if (options && options.count === "exact") {
      this.countMode = true;
    }
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, op: "==", value });
    return this;
  }

  neq(field, value) {
    this.filters.push({ field, op: "!=", value });
    return this;
  }

  order(field, { ascending = true } = {}) {
    this.orderBys.push({ field, ascending });
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  insert(rows) {
    this.operation = "insert";
    const rowList = Array.isArray(rows) ? rows : [rows];
    const now = new Date().toISOString();

    this.pendingInsertRows = rowList.map((row) => ({
      ...cleanPayload(row),
      id: row.id || generateUUID(),
      created_at: row.created_at || now,
      updated_at: row.updated_at || now,
    }));

    return this;
  }

  update(patch) {
    this.operation = "update";
    this.pendingUpdatePatch = {
      ...cleanPayload(patch),
      updated_at: patch.updated_at || new Date().toISOString(),
    };
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  async execute() {
    if (!db) {
      console.warn(`[Firestore:${this.collectionName}] operation skipped: Firestore is not configured.`);
      return {
        data: this.isSingle || this.isMaybeSingle ? null : [],
        error: new Error("Firestore database is not configured. Please set VITE_FIREBASE_* environment variables."),
        count: 0,
      };
    }

    try {
      if (this.operation === "insert") {
        const rows = this.pendingInsertRows || [];
        for (const row of rows) {
          const docRef = doc(db, this.collectionName, row.id);
          await setDoc(docRef, row);
        }
        const result = Array.isArray(this.pendingInsertRows) && this.pendingInsertRows.length === 1 && this.isSingle
          ? rows[0]
          : rows.length === 1 && !Array.isArray(this.pendingInsertRows)
          ? rows[0]
          : rows.length === 1 && this.isSingle
          ? rows[0]
          : rows;
        return { data: result, error: null };
      }

      // Query documents matching filters
      const colRef = collection(db, this.collectionName);
      let queryRef = colRef;

      // Apply first equality filter in Firestore query for indexed server fetching
      const firstFilter = this.filters[0];
      if (firstFilter) {
        queryRef = query(colRef, where(firstFilter.field, "==", firstFilter.value));
      }

      const snap = await getDocs(queryRef);
      let rows = snap.docs.map(docToRow);

      // Apply any additional filters in memory (prevents composite index errors)
      if (this.filters.length > 1) {
        for (let i = 1; i < this.filters.length; i++) {
          const f = this.filters[i];
          rows = rows.filter((r) => String(r[f.field]) === String(f.value));
        }
      }

      if (this.operation === "delete") {
        for (const row of rows) {
          await deleteDoc(doc(db, this.collectionName, row.id));
        }
        return { data: null, error: null };
      }

      if (this.operation === "update") {
        const patch = this.pendingUpdatePatch || {};
        const updatedRows = [];
        for (const row of rows) {
          const docRef = doc(db, this.collectionName, row.id);
          await updateDoc(docRef, patch);
          updatedRows.push({ ...row, ...patch });
        }
        const data = this.isSingle || this.isMaybeSingle ? updatedRows[0] || null : updatedRows;
        return { data, error: null };
      }

      // SELECT / COUNT operation
      // In-memory sorting (avoids composite index requirement in Firestore)
      if (this.orderBys.length > 0) {
        rows.sort((a, b) => {
          for (const order of this.orderBys) {
            const valA = a[order.field] ?? "";
            const valB = b[order.field] ?? "";
            if (valA < valB) return order.ascending ? -1 : 1;
            if (valA > valB) return order.ascending ? 1 : -1;
          }
          return 0;
        });
      }

      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount);
      }

      if (this.countMode) {
        return { count: rows.length, data: null, error: null };
      }

      if (this.isSingle) {
        if (!rows.length) {
          return { data: null, error: new Error(`Row not found in ${this.collectionName}`) };
        }
        return { data: rows[0], error: null };
      }

      if (this.isMaybeSingle) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null, count: rows.length };
    } catch (err) {
      console.error(`[Firestore:${this.collectionName}] operation failed:`, err);
      return { data: null, error: err, count: 0 };
    }
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const firebaseClient = {
  from(tableName) {
    return new FirestoreQueryBuilder(tableName);
  },
  auth: {
    async getUser() {
      if (!auth) {
        try {
          const stored = JSON.parse(localStorage.getItem("rankify_user") || "null");
          if (stored?.id) {
            return {
              data: {
                user: {
                  id: stored.id,
                  email: stored.email || "",
                  user_metadata: { full_name: stored.name || "User" },
                },
              },
              error: null,
            };
          }
        } catch {}
        return { data: { user: null }, error: null };
      }

      if (typeof auth.authStateReady === "function") {
        try {
          await auth.authStateReady();
        } catch {}
      }

      let user = auth.currentUser;
      if (!user) {
        user = await new Promise((resolve) => {
          let resolved = false;
          const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (!resolved) {
              resolved = true;
              unsubscribe();
              resolve(u);
            }
          });
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              unsubscribe();
              resolve(auth.currentUser || null);
            }
          }, 2500);
        });
      }

      if (!user) {
        try {
          const stored = JSON.parse(localStorage.getItem("rankify_user") || "null");
          if (stored?.id) {
            return {
              data: {
                user: {
                  id: stored.id,
                  email: stored.email || "",
                  user_metadata: { full_name: stored.name || "User" },
                  admin: stored.role === "admin" || stored.admin === true,
                  role: stored.role,
                },
              },
              error: null,
            };
          }
        } catch {}
        return { data: { user: null }, error: null };
      }

      let claims = {};
      try {
        const tokenResult = await user.getIdTokenResult();
        claims = tokenResult?.claims || {};
      } catch {}

      return {
        data: {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: { full_name: user.displayName || user.email?.split("@")[0] || "User" },
            admin: claims.admin === true || claims.role === "admin",
            role: claims.role || (claims.admin ? "admin" : undefined),
          },
        },
        error: null,
      };
    },
    async signUp({ email, password, options = {} }) {
      if (!auth) {
        return {
          data: { user: null },
          error: new Error("Firebase Authentication is not configured. Please set the VITE_FIREBASE_* environment variables in your deployment dashboard."),
        };
      }
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const fullName = options?.data?.full_name || options?.data?.name || "";
        if (fullName) {
          try {
            await updateProfile(cred.user, { displayName: fullName });
          } catch {}
        }
        return {
          data: {
            user: {
              id: cred.user.uid,
              email: cred.user.email,
              user_metadata: { full_name: fullName },
            },
          },
          error: null,
        };
      } catch (err) {
        return { data: { user: null }, error: err };
      }
    },
    async signInWithPassword({ email, password }) {
      if (!auth) {
        return {
          data: { user: null },
          error: new Error("Firebase Authentication is not configured. Please set the VITE_FIREBASE_* environment variables in your deployment dashboard."),
        };
      }
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return {
          data: {
            user: {
              id: cred.user.uid,
              email: cred.user.email,
              user_metadata: { full_name: cred.user.displayName || "" },
            },
          },
          error: null,
        };
      } catch (err) {
        return { data: { user: null }, error: err };
      }
    },
    async signOut() {
      if (!auth) return { error: null };
      try {
        await firebaseSignOut(auth);
        return { error: null };
      } catch (err) {
        return { error: err };
      }
    },
  },
};

export const supabase = firebaseClient;
export default firebaseClient;
