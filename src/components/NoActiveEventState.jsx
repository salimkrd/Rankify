import React from "react";
import { useNavigate } from "react-router-dom";

export default function NoActiveEventState() {
  const navigate = useNavigate();

  return (
    <div className="app-page overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="app-card flex min-h-[320px] max-w-[1080px] flex-col items-center justify-center rounded-xl border p-8 text-center shadow-sm">
        <h2 className="app-heading text-2xl font-bold">
          No Active Event Selected
        </h2>
        <p className="app-muted mt-2 max-w-[520px] text-sm">
          Please select an event from the Events page before creating items.
        </p>
        <button
          type="button"
          onClick={() => navigate("/dashboard/events")}
          className="app-success-btn mt-6 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm hover:opacity-90"
        >
          Go to Events
        </button>
      </div>
    </div>
  );
}
