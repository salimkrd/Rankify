import React, { useState } from "react";
import { isFirebaseConfigured, missingFirebaseEnvVars } from "../lib/firebase.js";
import { AlertTriangle, X } from "lucide-react";

export default function FirebaseConfigBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (isFirebaseConfigured || dismissed) {
    return null;
  }

  const missingList =
    missingFirebaseEnvVars && missingFirebaseEnvVars.length > 0
      ? missingFirebaseEnvVars.join(", ")
      : "VITE_FIREBASE_*";

  return (
    <div
      role="alert"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs sm:text-sm flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="truncate">
          <strong>Firebase Configuration Missing:</strong> Missing environment variables (
          <code className="text-amber-700 dark:text-amber-300 font-mono text-xs">{missingList}</code>).
          Authentication and Firestore features require these variables in your deployment dashboard (Vercel / GitHub Secrets).
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-700 dark:text-amber-300 hover:opacity-75 p-1 shrink-0 rounded transition"
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
