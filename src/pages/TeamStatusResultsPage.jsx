import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, Download, Edit, Eye, MoreVertical, Plus, Trash2, X } from "lucide-react";
import TeamStatusTemplatePreview from "../components/TeamStatusTemplatePreview";
import { getUserStorageKey } from "../utils/storage.js";
import NoActiveEventState from "../components/NoActiveEventState.jsx";

const STORAGE_KEY = "rankify_team_status_results";
const TEMPLATES_KEY = "rankify_team_status_templates";
const TEAMS_KEY = "rankify_teams";
const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const safeParse = (v, fallback = null) => {
  try {
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const asArray = (value) => (Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : []);

function readTeamsForActiveEvent(activeEventId) {
  const stored = safeParse(localStorage.getItem(getUserStorageKey(TEAMS_KEY)), null);
  let eventTeams = [];
  if (Array.isArray(stored)) eventTeams = stored.filter((t) => String(t?.eventId) === String(activeEventId));
  else if (stored && typeof stored === "object") eventTeams = Array.isArray(stored[activeEventId]) ? stored[activeEventId] : [];
  return eventTeams.map((t) => ({ id: t.id || uid(), name: t.name || t.teamName || t.title || "Alpha" }));
}

function flattenTemplatesStorage(key) {
  const raw = safeParse(localStorage.getItem(getUserStorageKey(key)), []);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    // object mapping eventId->[templates]
    return Object.values(raw).filter(Array.isArray).flat();
  }
  return [];
}

function injectResultIntoTemplate(template, result) {
  const tpl = { ...(template || {}) };
  const preview = { ...(tpl.previewData || {}) };
  // map title parts to titleValues by element id order
  const titleElements = Array.isArray(tpl.elements) ? tpl.elements.filter((e) => e.kind === "title") : [];
  const titleValues = {};
  if (Array.isArray(result?.titleParts)) {
    (result.titleParts || []).forEach((part, i) => {
      const el = titleElements[i];
      if (el) titleValues[el.id] = part;
    });
  } else {
    Object.assign(titleValues, preview.titleValues || {});
  }
  // map teams by slot.teamIndex
  const slots = Array.isArray(tpl.elements) ? tpl.elements.filter((e) => e.kind === "teamSlot") : [];
  const teams = [];
  if (Array.isArray(result?.teams)) {
    (result.teams || []).forEach((team, i) => {
      const slot = slots.find((s) => Number(s.teamIndex || 0) === i) || slots[i];
      const idx = slot ? Number(slot.teamIndex ?? i) : i;
      teams[idx] = { name: team.teamName || team.name || team.team || "Alpha", score: String(team.score ?? "0") };
    });
  } else if (Array.isArray(preview.teams)) {
    preview.teams.forEach((t, i) => {
      teams[i] = { name: t.name || t.teamName || "Alpha", score: String(t.score ?? "0") };
    });
  }
  tpl.previewData = { ...preview, titleValues, teams };
  return tpl;
}

export default function TeamStatusResultsPage() {
  const [results, setResults] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sort, setSort] = useState("Sort by Date");
  const [modalMode, setModalMode] = useState(null); // create|edit
  const [form, setForm] = useState({ statusName: "New Team Point Status", templateId: "", titleParts: ["Final", "Point", "Status"], teams: [{ id: "t1", teamName: "Alpha", score: "0" }] });
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null); // viewing result for posters
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    function load() {
      const events = asArray(safeParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []));
      const activeId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
      const event = events.find((e) => String(e.id) === String(activeId)) || null;

      if (!event?.id) {
        setActiveEvent(null);
        setTemplates([]);
        setTeams([]);
        setResults([]);
        return;
      }

      setActiveEvent({ id: String(event.id || activeId), name: event.name || event.title || "Active Event" });
      setTemplates(flattenTemplatesStorage(TEMPLATES_KEY));
      setTeams(readTeamsForActiveEvent(activeId));

      const raw = safeParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []);
      // support grouped by event id or array
      const list = asArray(raw).filter((item) => String(item.eventId) === String(activeId));
      setResults(list);
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener("rankify-active-event-changed", load);
    window.addEventListener("rankify-data-changed", load);
    window.addEventListener("rankify-events-changed", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("rankify-active-event-changed", load);
      window.removeEventListener("rankify-data-changed", load);
      window.removeEventListener("rankify-events-changed", load);
    };
  }, []);

  const saveResults = (next) => {
    if (!activeEvent?.id) return;

    setResults(next);
    // write grouped by eventId if existing stored as object
    const raw = safeParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), null);
    if (raw && !Array.isArray(raw) && typeof raw === "object") {
      const activeId = activeEvent.id;
      const nextRaw = { ...(raw || {}), [activeId]: next };
      localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify(nextRaw));
    } else {
      // fallback: store as array (flat)
      // merge with other-event items
      const existing = asArray(safeParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []));
      const others = existing.filter((item) => String(item.eventId) !== String(activeEvent.id));
      localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify([...others, ...next]));
    }
    window.dispatchEvent(new Event("rankify-data-changed"));
  };

  const openCreate = () => {
    if (!activeEvent?.id) {
      alert("Please select an active event first.");
      return;
    }

    const next = { statusName: "New Team Point Status", templateId: templates[0]?.id || "", titleParts: ["Final", "Point", "Status"], teams: [{ id: uid(), teamName: teams[0]?.name || "Alpha", score: "0" }] };
    setForm(next);
    setEditingId(null);
    setModalMode("create");
  };

  const openEdit = (result) => {
    setForm({ statusName: result.statusName || "", templateId: result.templateId || "", titleParts: result.titleParts || ["Final", "Point", "Status"], teams: result.teams || [{ id: uid(), teamName: "Alpha", score: "0" }] });
    setEditingId(result.id);
    setModalMode("edit");
  };

  const closeEditor = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!activeEvent?.id) {
      alert("Please select an active event first.");
      return;
    }

    const cleaned = {
      id: editingId || uid(),
      eventId: activeEvent.id,
      statusName: String(form.statusName || "").trim() || "Untitled",
      templateId: form.templateId || "",
      titleParts: Array.isArray(form.titleParts) ? form.titleParts : ["Final", "Point", "Status"],
      teams: Array.isArray(form.teams) ? form.teams.map((t) => ({ id: t.id || uid(), teamName: t.teamName || t.name || "Alpha", score: String(t.score ?? "0") })) : [],
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (modalMode === "edit") {
      const next = results.map((r) => (r.id === editingId ? { ...r, ...cleaned, createdAt: r.createdAt || cleaned.createdAt } : r));
      saveResults(next);
    } else {
      saveResults([...(results || []), cleaned]);
    }
    closeEditor();
  };

  const remove = (id) => {
    if (!window.confirm("Delete this status?")) return;
    saveResults((results || []).filter((r) => r.id !== id));
  };

  const openViewPosters = (result) => {
    setViewing(result);
  };

  const closeViewPosters = () => setViewing(null);

  const downloadPoster = async (template, result) => {
    let offscreen = null;
    let root = null;
    try {
      const tpl = injectResultIntoTemplate(template, result);
      const canvasWidth = Number(tpl.canvas?.width || 1080);
      const canvasHeight = Number(tpl.canvas?.height || 1350);

      // create hidden offscreen container at the target size
      offscreen = document.createElement("div");
      offscreen.setAttribute('data-offscreen-poster', 'true');
      offscreen.style.position = "fixed";
      offscreen.style.left = "-100000px";
      offscreen.style.top = "0";
      offscreen.style.width = `${canvasWidth}px`;
      offscreen.style.height = `${canvasHeight}px`;
      offscreen.style.overflow = 'hidden';
      document.body.appendChild(offscreen);

      root = createRoot(offscreen);
      // render full-size poster at scale 1
      root.render(<TeamStatusTemplatePreview template={tpl} scale={1} selectedId={""} editable={false} />);

      // wait for layout, fonts and images
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (document.fonts?.ready) await document.fonts.ready;

      const poster = offscreen.querySelector(".team-status-template-canvas");
      if (!poster) throw new Error("Poster not rendered");

      // wait for any images inside poster to load
      const imgs = Array.from(poster.querySelectorAll('img'));
      await Promise.all(imgs.map((img) => new Promise((res) => {
        if (img.complete) return res();
        img.onload = img.onerror = res;
      })));
      // small delay to ensure fonts/images applied
      await new Promise((r) => setTimeout(r, 200));

      // remove border/shadow from poster wrapper for clean capture (offscreen only)
      const prevBorder = poster.style.border;
      const prevBoxShadow = poster.style.boxShadow;
      poster.style.border = 'none';
      poster.style.boxShadow = 'none';

      const { default: html2canvas } = await import("html2canvas");
      const options = {
        backgroundColor: tpl.canvas?.backgroundColor ?? null,
        useCORS: true,
        allowTaint: true,
        scale: 2,
        width: canvasWidth,
        height: canvasHeight,
        windowWidth: canvasWidth,
        windowHeight: canvasHeight,
        scrollX: 0,
        scrollY: 0,
      };

      const canvas = await html2canvas(poster, options);
      const image = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const name = `${result.statusName || "status"}-${template.name || template.id || "template"}`.replace(/[\\/:*?"<>|]+/g, "-");
      link.href = image;
      link.download = `${name}.jpg`;
      link.click();

      // restore styles
      poster.style.border = prevBorder;
      poster.style.boxShadow = prevBoxShadow;
    } catch (err) {
      console.error(err);
      alert("Unable to export JPG. See console.");
    } finally {
      if (root) root.unmount();
      if (offscreen) offscreen.remove();
    }
  };

  const eventResults = useMemo(() => (activeEvent?.id ? (results || []).filter((r) => String(r.eventId) === String(activeEvent.id)) : []), [results, activeEvent?.id]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...eventResults];
    if (q) list = list.filter((item) => [item.statusName, ...(item.titleParts || []), ...(item.teams || []).flatMap((t) => [t.teamName, t.score])].join(" ").toLowerCase().includes(q));
    if (statusFilter === "Published") list = list.filter((i) => i.published);
    if (statusFilter === "Draft") list = list.filter((i) => !i.published);
    if (sort === "Oldest First") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [eventResults, search, statusFilter, sort]);

  return (
    <section className="app-page min-h-screen overflow-x-hidden p-6 max-sm:p-4">
      <style>{teamStatusResultsStyles}</style>
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0">
          <h1 className="app-heading text-2xl font-bold">Team Point Statuses for {activeEvent?.name || "No active event"}</h1>
          <p className="app-muted">Manage and generate point status posters.</p>
        </div>
        <div className="ml-auto max-sm:ml-0">
          <button onClick={openCreate} disabled={!activeEvent?.id} className="app-success-btn inline-flex items-center gap-2 rounded-md px-4 py-2 font-semibold shadow-sm hover:opacity-90">
            <Plus size={16} strokeWidth={1.9} aria-hidden="true" />
            Create New Status
          </button>
        </div>
      </header>

      {!activeEvent?.id ? (
        <NoActiveEventState />
      ) : <>
      <div className="app-card mt-6 rounded-lg border p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input placeholder="Search your statuses..." value={search} onChange={(e) => setSearch(e.target.value)} className="app-input min-w-[220px] flex-1 rounded-md border px-3 py-2 max-sm:min-w-0 max-sm:basis-full" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="app-select min-w-[150px] rounded-md border px-3 py-2 max-sm:basis-full">
            <option>All Status</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="app-select min-w-[150px] rounded-md border px-3 py-2 max-sm:basis-full">
            <option>Sort by Date</option>
            <option>Oldest First</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="app-card rounded-xl border border-dashed px-4 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--app-surface-elevated)] text-[var(--app-muted)]">
              <BarChart3 size={44} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3 className="app-heading mt-4 text-xl font-bold">No Team Point Statuses Yet</h3>
            <p className="app-muted mt-2">You haven't created any team point status posters yet. Get started by creating your first one!</p>
            <div className="mt-4">
              <button className="app-success-btn rounded-md px-4 py-2 font-semibold hover:opacity-90" onClick={openCreate}>Create Your First Team Point Status Poster</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))' }}>
            {filtered.map((item) => {
              return (
                <div key={item.id} className="app-card relative rounded-lg border p-4 shadow-sm" style={{ minHeight: 360 }}>
                  <div className="flex h-40 w-full flex-col items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-elevated)]">
                    <div className="text-lg font-bold text-[var(--app-heading)]">{item.statusName}</div>
                    <div className="app-muted mt-1 text-sm">{(item.teams || []).length} teams listed</div>
                  </div>

                  <div className="app-text mt-4 text-sm">{(item.titleParts || []).join(" / ")}</div>
                  <div className="app-muted mt-2 text-sm">Created: {new Date(item.createdAt || item.created || Date.now()).toLocaleDateString()}</div>

                  <div className="mt-4 flex items-center">
                    <button onClick={() => openViewPosters(item)} className="app-card flex items-center gap-2 rounded-md border px-3 py-1 text-sm hover:bg-[var(--app-surface-elevated)]">
                      <Eye size={16} strokeWidth={1.9} aria-hidden="true" />
                      <span>View Posters</span>
                    </button>

                    <div className="flex-1" />

                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)} className="rounded-full px-2 py-1 text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-heading)]" aria-label="Status actions">
                        <MoreVertical size={18} strokeWidth={1.9} aria-hidden="true" />
                      </button>
                      {menuOpenId === item.id && (
                        <div className="app-dropdown absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-md border shadow-lg">
                          <div className="app-muted border-b border-[var(--app-border)] px-3 py-2 text-xs">Actions</div>
                          <button onClick={() => { setMenuOpenId(null); openEdit(item); }} className="w-full px-3 py-2 text-left hover:bg-[var(--app-surface-elevated)]">
                            <Edit className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                            Edit
                          </button>
                          <button onClick={() => { setMenuOpenId(null); remove(item.id); }} className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-6 max-sm:p-3">
          <div className="app-modal relative w-full max-w-[760px] overflow-y-auto rounded-xl border p-0 shadow-2xl" style={{ maxHeight: 'calc(100vh - 24px)' }}>
            <button type="button" onClick={closeEditor} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, left: 'auto' }} className="rounded-md bg-transparent p-2 text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-heading)]">
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <form onSubmit={submit} className="p-6">
              <header>
                <h2 className="app-heading text-2xl font-bold">{modalMode === "create" ? "Create New Team Point Status" : "Edit Team Point Status"}</h2>
                <p className="app-muted mt-1">Create a new team point status to generate posters.</p>
              </header>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <label className="block">
                    <div className="app-text mb-1 text-sm font-semibold">Status Entry Name</div>
                    <input value={form.statusName} onChange={(e) => setForm((c) => ({ ...c, statusName: e.target.value }))} className="app-input w-full rounded-md border px-3 py-2" />
                  </label>
                  <label className="block">
                    <div className="app-text mb-1 text-sm font-semibold">Select Template</div>
                    <select value={form.templateId} onChange={(e) => setForm((c) => ({ ...c, templateId: e.target.value }))} className="app-select w-full rounded-md border px-3 py-2">
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
                    </select>
                  </label>
                </div>

                <div className="app-surface-elevated rounded-md border border-[var(--app-border)] p-4">
                  <h3 className="app-heading font-bold">Title Parts</h3>
                  <p className="app-muted mt-1 text-sm">Customize the text for each title line.</p>
                  <div className="mt-3 space-y-2">
                    {(form.titleParts || []).map((part, idx) => (
                      <input key={idx} value={part} onChange={(e) => setForm((c) => ({ ...c, titleParts: c.titleParts.map((p, i) => i === idx ? e.target.value : p) }))} className="app-input w-full rounded-md border px-3 py-2" />
                    ))}
                  </div>
                </div>

                <div className="app-surface-elevated rounded-md border border-[var(--app-border)] p-4">
                  <h3 className="app-heading font-bold">Teams & Scores</h3>
                  <p className="app-muted mt-1 text-sm">Enter the names and scores for each team.</p>
                  <div className="mt-3 space-y-2">
                    {(form.teams || []).map((t, idx) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-3">
                        <select value={t.teamName} onChange={(e) => setForm((c) => ({ ...c, teams: c.teams.map((x, i) => i === idx ? { ...x, teamName: e.target.value } : x) }))} className="app-select min-w-[180px] flex-1 rounded-md border px-3 py-2 max-sm:min-w-0 max-sm:basis-full">
                          {teams.map((tm) => <option key={tm.id} value={tm.name}>{tm.name}</option>)}
                        </select>
                        <input value={t.score} onChange={(e) => setForm((c) => ({ ...c, teams: c.teams.map((x, i) => i === idx ? { ...x, score: e.target.value } : x) }))} className="app-input w-24 rounded-md border px-3 py-2 max-sm:w-full" />
                        <button type="button" onClick={() => setForm((c) => ({ ...c, teams: c.teams.filter((_, i) => i !== idx) }))} className="px-3 py-1 text-red-600 hover:text-red-700">Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm((c) => ({ ...c, teams: [...(c.teams||[]), { id: uid(), teamName: teams[0]?.name || "Alpha", score: "0" }] }))} className="app-success-btn mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 font-semibold hover:opacity-90">
                      <Plus size={16} strokeWidth={2} aria-hidden="true" />
                      Add Team Slot
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="app-heading font-bold">Live Preview</h3>
                  <p className="app-muted mt-1 text-sm">Preview uses the selected template and example data.</p>
                  <div className="mt-3">
                    <div className="poster-preview-frame" style={{ width: 280, maxWidth: '100%', margin: '0 auto' }}>
                      {(() => {
                        const tpl = templates.find((t) => String(t.id) === String(form.templateId)) || templates[0] || {};
                        const resultPreviewData = {
                          titleParts: Array.isArray(form.titleParts) ? form.titleParts : [],
                          teams: Array.isArray(form.teams)
                            ? form.teams.map((team) => ({ teamName: team.teamName || team.name || "Alpha", score: String(team.score ?? "0") }))
                            : [],
                        };
                        const injected = injectResultIntoTemplate(tpl, resultPreviewData);
                        return <TeamStatusTemplatePreview template={injected} scale={256 / (injected.canvas?.width || 1080)} editable={false} />;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 mt-4">
                  <button type="button" onClick={closeEditor} className="app-card rounded-md border px-4 py-2 hover:bg-[var(--app-surface-elevated)]">Cancel</button>
                  <button type="submit" className="app-success-btn rounded-md px-4 py-2 font-semibold hover:opacity-90">{modalMode === "create" ? "Create Status" : "Update Status"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Posters Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-6 max-sm:p-3">
          <div className="app-modal relative w-full max-w-[720px] overflow-y-auto rounded-xl border p-6 shadow-2xl" style={{ maxHeight: 'calc(100vh - 24px)' }}>
            <button type="button" onClick={closeViewPosters} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, left: 'auto' }} className="rounded-md bg-transparent p-2 text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-heading)]">
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <header>
              <h2 className="app-heading text-lg font-bold">Posters for: {viewing.statusName}</h2>
              <p className="app-muted mt-1 text-sm">View and download posters for this team point status.</p>
            </header>

            <div className="mt-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
              {(flattenTemplatesStorage(TEMPLATES_KEY) || []).map((template) => {
                const tpl = injectResultIntoTemplate(template, viewing);
                return (
                  <div key={template.id} className="app-card w-full rounded-lg border p-6 shadow-sm">
                    <div className="app-heading mb-4 font-bold">{template.name || template.id}</div>
                    <div className="flex justify-center">
                      <div className="poster-preview-frame" style={{ maxWidth: 340, width: '100%' }}>
                        <TeamStatusTemplatePreview template={tpl} scale={320 / (tpl.canvas?.width || 1080)} editable={false} />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <button onClick={() => downloadPoster(template, viewing)} className="app-trophy-btn inline-flex items-center gap-2 rounded-md px-4 py-2 font-semibold hover:opacity-90">
                        <Download size={16} strokeWidth={1.9} aria-hidden="true" />
                        Download Poster
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const teamStatusResultsStyles = `
.poster-preview-frame{
  overflow:auto;
  border:1px solid #e2e8f0;
  padding:12px;
  border-radius:8px;
  background:#ffffff;
  color-scheme:light;
}
.poster-preview-frame .team-status-template-canvas{
  color-scheme:light;
}
`;
