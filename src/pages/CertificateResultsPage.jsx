import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Edit, Eye, FileText, Plus, Trash2, X } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";
import NoActiveEventState from "../components/NoActiveEventState.jsx";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const RESULTS_KEY = "rankify_certificate_results";
const TEMPLATES_KEY = "rankify_certificate_templates";
const TEAMS_KEY = "rankify_teams";
const CATEGORIES_KEY = "rankify_categories";

const uid = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `certificate_result_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const safeJsonParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([eventId, items]) =>
      Array.isArray(items) ? items.map((item) => ({ ...item, eventId: item.eventId || eventId })) : []
    );
  }
  return [];
};

const readMixedArray = (key) => {
  const direct = asArray(safeJsonParse(localStorage.getItem(key), []));
  const userScoped = asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(key)), []));
  const seen = new Set();
  return [...direct, ...userScoped].filter((item, index) => {
    const id = String(item?.id || item?.templateId || `${key}-${index}`);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const textOf = (item, keys, fallback = "") => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "") {
      return String(item[key]);
    }
  }
  return fallback;
};

const readEvents = () => asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []));

const getActiveEvent = () => {
  const events = readEvents();
  const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  if (!activeEventId) return null;
  return events.find((event) => String(event.id) === String(activeEventId)) || null;
};

const readOptionsForEvent = (key, eventId, nameKeys) => {
  const stored = safeJsonParse(localStorage.getItem(getUserStorageKey(key)), null);
  let items = [];

  if (Array.isArray(stored)) {
    items = stored.filter((item) => String(item?.eventId) === String(eventId));
  } else if (stored && typeof stored === "object") {
    items = Array.isArray(stored[eventId]) ? stored[eventId] : [];
  }

  return items
    .map((item, index) => {
      const name = textOf(item, nameKeys);
      if (!name) return null;
      return {
        id: String(item?.id || item?.teamId || item?.categoryId || name || `${key}-${index}`),
        name,
      };
    })
    .filter(Boolean);
};

const readTemplatesForEvent = (eventId) =>
  readMixedArray(TEMPLATES_KEY)
    .filter((template) => !template?.eventId || String(template.eventId) === String(eventId))
    .map((template, index) => ({
      ...template,
      id: String(template.id || template.templateId || `certificate-template-${index}`),
      name: textOf(template, ["name", "templateName", "title"], `Certificate Template ${index + 1}`),
    }));

const readResults = () => readMixedArray(RESULTS_KEY);

const saveResults = (results) => {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("rankify-data-changed"));
};

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
};

const fileNameSafe = (value) =>
  String(value || "certificate")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const fieldLabels = {
  candidateName: "Candidate Name",
  programName: "Program Name",
  candidatePosition: "Candidate Position",
  candidateTeam: "Candidate Team",
  programCategory: "Program Category",
  candidateGrade: "Candidate Grade",
  issueDate: "Issue Date",
};

const certificatePlaceholders = [
  ["[Candidate Name]", "candidateName"],
  ["[Program Name]", "programName"],
  ["[Candidate Position]", "candidatePosition"],
  ["[Candidate Team]", "candidateTeam"],
  ["[Program Category]", "programCategory"],
  ["[Candidate Grade]", "candidateGrade"],
  ["[Issue Date]", "issueDate"],
  ["{{candidateName}}", "candidateName"],
  ["{{programName}}", "programName"],
  ["{{candidatePosition}}", "candidatePosition"],
  ["{{candidateTeam}}", "candidateTeam"],
  ["{{programCategory}}", "programCategory"],
  ["{{candidateGrade}}", "candidateGrade"],
  ["{{issueDate}}", "issueDate"],
];

const replaceCertificatePlaceholders = (value, result) => {
  let output = String(value || "");
  certificatePlaceholders.forEach(([token, key]) => {
    output = output.split(token).join(result?.[key] || "");
  });
  return output;
};

const getCertificateText = (element, result) => {
  if (element.dataSource && element.dataSource !== "manual") {
    return result?.[element.dataSource] || element.label || fieldLabels[element.dataSource] || "";
  }
  return replaceCertificatePlaceholders(element.content || element.label || "", result);
};

function CertificateCanvas({ template, result, scale = 1, captureId }) {
  const elements = Array.isArray(template?.elements) ? template.elements : [];
  const width = Number(template?.canvasWidth || template?.canvas?.width || 842);
  const height = Number(template?.canvasHeight || template?.canvas?.height || 596);
  const backgroundImage = template?.backgroundImage || template?.canvas?.backgroundImage || "";
  const backgroundColor = template?.backgroundColor || template?.canvas?.backgroundColor || "#ECECEC";

  return (
    <div
      className="certificate-capture-wrapper"
      data-certificate-id={captureId}
      style={{ width: width * scale, height: height * scale, position: "relative", overflow: "hidden", colorScheme: "light" }}
    >
      <div
        className="certificate-canvas"
        data-certificate-canvas="true"
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: scale === 1 ? "none" : `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {elements.length ? (
          elements.map((element) => (
            <div
              key={element.id}
              className="absolute whitespace-pre-wrap"
              style={{
                left: Number(element.x || 0),
                top: Number(element.y || 0),
                width: element.width,
                minHeight: Number(element.fontSize || 16) * Number(element.lineHeight || 1.2),
                fontFamily: element.fontFamily,
                fontSize: Number(element.fontSize || 16),
                fontWeight: element.fontWeight,
                color: element.color,
                lineHeight: element.lineHeight,
                textAlign: element.align,
                background: element.showBg ? element.backgroundColor || "#ffffff" : "transparent",
                overflow: "visible",
                boxSizing: "border-box",
              }}
            >
              {getCertificateText(element, result)}
            </div>
          ))
        ) : (
          <div className="certificate-fallback">
            <p>Certificate</p>
            <h1>{result.candidateName}</h1>
            <h2>{result.programName}</h2>
            <p>{result.candidatePosition}</p>
            <p>{result.candidateTeam}</p>
            <p>{result.programCategory}</p>
            <strong>{result.candidateGrade}</strong>
            <small>{result.issueDate}</small>
          </div>
        )}
      </div>
    </div>
  );
}

const emptyForm = () => ({
  templateId: "",
  candidateName: "",
  programName: "",
  candidatePosition: "",
  candidateTeam: "",
  teamId: "",
  categoryId: "",
  programCategory: "",
  candidateGrade: "",
  issueDate: new Date().toISOString().slice(0, 10),
});

export default function CertificateResultsPage() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [results, setResults] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Newest First");
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    function load() {
      const event = getActiveEvent();
      setActiveEvent(event);
      setResults(readResults());

      if (!event?.id) {
        setTemplates([]);
        setTeams([]);
        setCategories([]);
        return;
      }

      setTemplates(readTemplatesForEvent(event.id));
      setTeams(readOptionsForEvent(TEAMS_KEY, event.id, ["name", "teamName", "title"]));
      setCategories(readOptionsForEvent(CATEGORIES_KEY, event.id, ["name", "category", "title"]));
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

  const hasActiveEvent = Boolean(activeEvent?.id);
  const eventResults = useMemo(
    () => (hasActiveEvent ? results.filter((result) => String(result.eventId) === String(activeEvent.id)) : []),
    [activeEvent?.id, hasActiveEvent, results]
  );

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = [...eventResults];
    if (query) {
      list = list.filter((result) =>
        [
          result.candidateName,
          result.programName,
          result.candidatePosition,
          result.candidateTeam,
          result.programCategory,
          result.candidateGrade,
          result.issueDate,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    if (sort === "Candidate Name") list.sort((a, b) => String(a.candidateName || "").localeCompare(String(b.candidateName || "")));
    else if (sort === "Program Name") list.sort((a, b) => String(a.programName || "").localeCompare(String(b.programName || "")));
    else if (sort === "Oldest First") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [eventResults, search, sort]);

  const getTemplate = (templateId) =>
    templates.find((template) => String(template.id) === String(templateId)) || templates[0] || null;
  const getTeam = (teamIdOrName) =>
    teams.find((team) => String(team.id) === String(teamIdOrName) || String(team.name) === String(teamIdOrName)) || null;
  const getCategory = (categoryIdOrName) =>
    categories.find((category) => String(category.id) === String(categoryIdOrName) || String(category.name) === String(categoryIdOrName)) || null;

  function persist(nextResults) {
    setResults(nextResults);
    saveResults(nextResults);
  }

  function openCreate() {
    if (!hasActiveEvent) {
      alert("Please select an active event first.");
      return;
    }

    setForm({
      ...emptyForm(),
      templateId: templates[0]?.id || "",
      teamId: teams[0]?.id || "",
      candidateTeam: teams[0]?.name || "",
      categoryId: categories[0]?.id || "",
      programCategory: categories[0]?.name || "",
    });
    setEditingId(null);
    setModalMode("create");
  }

  function openEdit(result) {
    const selectedTeam = getTeam(result.teamId || result.candidateTeam);
    const selectedCategory = getCategory(result.categoryId || result.programCategory);
    setForm({
      templateId: result.templateId || templates[0]?.id || "",
      candidateName: result.candidateName || "",
      programName: result.programName || "",
      candidatePosition: result.candidatePosition || "",
      candidateTeam: selectedTeam?.name || result.candidateTeam || "",
      teamId: selectedTeam?.id || "",
      categoryId: selectedCategory?.id || "",
      programCategory: selectedCategory?.name || result.programCategory || "",
      candidateGrade: result.candidateGrade || "",
      issueDate: result.issueDate || "",
    });
    setEditingId(result.id);
    setModalMode("edit");
  }

  function closeEditor() {
    setModalMode(null);
    setEditingId(null);
  }

  function submitResult(event) {
    event.preventDefault();

    if (!hasActiveEvent) {
      alert("Please select an active event first.");
      return;
    }

    if (!form.templateId) {
      alert("Please create or select a certificate template first.");
      return;
    }

    const selectedTeam = getTeam(form.teamId || form.candidateTeam);
    const selectedCategory = getCategory(form.categoryId || form.programCategory);

    if (!selectedTeam) {
      alert("Please create or select a team first.");
      return;
    }
    if (!selectedCategory) {
      alert("Please create or select a category first.");
      return;
    }

    const now = new Date().toISOString();
    const cleaned = {
      templateId: form.templateId,
      candidateName: form.candidateName.trim(),
      programName: form.programName.trim(),
      candidatePosition: form.candidatePosition.trim(),
      candidateTeam: selectedTeam.name,
      programCategory: selectedCategory.name,
      candidateGrade: form.candidateGrade.trim(),
      issueDate: form.issueDate,
    };

    if (modalMode === "edit") {
      persist(results.map((result) => (String(result.id) === String(editingId) ? { ...result, ...cleaned } : result)));
    } else {
      persist([
        ...results,
        {
          id: uid(),
          eventId: activeEvent.id,
          ...cleaned,
          createdAt: now,
        },
      ]);
    }

    closeEditor();
  }

  function confirmDelete() {
    if (!deleting) return;
    persist(results.filter((result) => String(result.id) !== String(deleting.id)));
    setDeleting(null);
  }

  async function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            })
      )
    );
  }

  async function downloadCertificate(template, result) {
    if (!template) {
      alert("Certificate template is missing.");
      return;
    }

    let offscreen = null;
    let root = null;

    try {
      const width = Number(template.canvasWidth || template.canvas?.width || 842);
      const height = Number(template.canvasHeight || template.canvas?.height || 596);
      offscreen = document.createElement("div");
      offscreen.style.position = "fixed";
      offscreen.style.left = "-100000px";
      offscreen.style.top = "0";
      offscreen.style.width = `${width}px`;
      offscreen.style.height = `${height}px`;
      offscreen.style.pointerEvents = "none";
      document.body.appendChild(offscreen);

      root = createRoot(offscreen);
      root.render(<CertificateCanvas template={template} result={result} scale={1} captureId="certificate-export" />);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (document.fonts?.ready) await document.fonts.ready;

      const certificate = offscreen.querySelector('[data-certificate-id="certificate-export"]');
      if (!certificate) throw new Error("Certificate preview was not rendered.");

      await waitForImages(certificate);
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(certificate, {
        backgroundColor: "#ffffff",
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
      });

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Unable to prepare certificate download.");
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileNameSafe(`${result.candidateName || "certificate"}-${template.name || "template"}.jpg`);
          link.click();
          URL.revokeObjectURL(url);
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      console.error("Unable to export certificate.", error);
      alert("Unable to download certificate. Please try again.");
    } finally {
      if (root) root.unmount();
      if (offscreen) offscreen.remove();
    }
  }

  const selectedViewTemplate = viewing ? getTemplate(viewing.templateId) : null;

  return (
    <section className="certificate-results-page">
      <div className="results-header">
        <div>
          <h1>Certificate Results</h1>
          <p>
            {activeEvent?.name
              ? `View and generate certificates for event: ${activeEvent.name}`
              : "View and generate certificates"}
          </p>
        </div>
        <button className="primary-btn header-btn" type="button" onClick={openCreate} disabled={!hasActiveEvent}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          Create Certificate Result
        </button>
      </div>

      {!hasActiveEvent ? (
        <NoActiveEventState />
      ) : (
        <>
          <div className="filter-card">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search certificates..."
              aria-label="Search certificate results"
            />
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort certificate results">
              <option>Newest First</option>
              <option>Oldest First</option>
              <option>Candidate Name</option>
              <option>Program Name</option>
            </select>
          </div>

          {filteredResults.length ? (
            <div className="results-grid">
              {filteredResults.map((result) => (
                <article className="result-card" key={result.id}>
                  <div className="card-top">
                    <div>
                      <h2>{result.candidateName || "Unnamed Candidate"}</h2>
                      <p>{result.programName || "Untitled Program"}</p>
                    </div>
                    <span className="status-badge">Certificate</span>
                  </div>

                  <div className="certificate-details">
                    <span>Category</span>
                    <strong>{result.programCategory || "-"}</strong>
                    <span>Team</span>
                    <strong>{result.candidateTeam || "-"}</strong>
                    <span>Grade</span>
                    <strong>{result.candidateGrade || "-"}</strong>
                    <span>Issue Date</span>
                    <strong>{result.issueDate || "-"}</strong>
                  </div>

                  <p className="result-meta">Created: {formatDate(result.createdAt)}</p>

                  <div className="card-actions">
                    <div className="left-actions">
                      <button className="secondary-btn view-btn" type="button" onClick={() => setViewing(result)}>
                        <Eye size={18} strokeWidth={1.9} aria-hidden="true" />
                        View/Download
                      </button>
                      <button className="secondary-btn" type="button" onClick={() => openEdit(result)}>
                        <Edit size={18} strokeWidth={1.9} aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                    <button className="delete-icon" type="button" onClick={() => setDeleting(result)} aria-label={`Delete ${result.candidateName || "certificate result"}`}>
                      <Trash2 size={20} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <FileText size={38} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h2>No Certificate Results Found</h2>
              <p>Create your first certificate result for this event.</p>
              <button className="primary-btn" type="button" onClick={openCreate}>
                Create Certificate Result
              </button>
            </div>
          )}
        </>
      )}

      {modalMode && (
        <div className="modal-overlay">
          <form className="editor-modal" onSubmit={submitResult}>
            <button className="close-btn" type="button" onClick={closeEditor} aria-label="Close">
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <h2>{modalMode === "edit" ? "Edit Certificate Result" : "Create Certificate Result"}</h2>
            <p className="modal-subtitle">
              {modalMode === "edit" ? "Update the certificate details below." : "Create a certificate by filling in the details below."}
            </p>

            <div className="form-grid certificate-form-grid">
              <label>
                Certificate Template
                <select
                  value={form.templateId}
                  onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value }))}
                  required
                  disabled={!templates.length}
                >
                  {templates.length ? (
                    templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Create a certificate template first</option>
                  )}
                </select>
              </label>

              <label>
                Candidate Name
                <input
                  value={form.candidateName}
                  onChange={(event) => setForm((current) => ({ ...current, candidateName: event.target.value }))}
                  placeholder="Candidate name"
                  required
                />
              </label>

              <label>
                Program Name
                <input
                  value={form.programName}
                  onChange={(event) => setForm((current) => ({ ...current, programName: event.target.value }))}
                  placeholder="Program name"
                  required
                />
              </label>

              <label>
                Candidate Position
                <input
                  value={form.candidatePosition}
                  onChange={(event) => setForm((current) => ({ ...current, candidatePosition: event.target.value }))}
                  placeholder="Candidate position"
                  required
                />
              </label>

              <label>
                Candidate Team
                <select
                  value={form.teamId}
                  onChange={(event) => {
                    const selectedTeam = getTeam(event.target.value);
                    setForm((current) => ({
                      ...current,
                      teamId: selectedTeam?.id || "",
                      candidateTeam: selectedTeam?.name || "",
                    }));
                  }}
                  required
                  disabled={!teams.length}
                >
                  {teams.length ? (
                    teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Create a team first</option>
                  )}
                </select>
              </label>

              <label>
                Program Category
                <select
                  value={form.categoryId}
                  onChange={(event) => {
                    const selectedCategory = getCategory(event.target.value);
                    setForm((current) => ({
                      ...current,
                      categoryId: selectedCategory?.id || "",
                      programCategory: selectedCategory?.name || "",
                    }));
                  }}
                  required
                  disabled={!categories.length}
                >
                  {categories.length ? (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Create a category first</option>
                  )}
                </select>
              </label>

              <label>
                Candidate Grade
                <input
                  value={form.candidateGrade}
                  onChange={(event) => setForm((current) => ({ ...current, candidateGrade: event.target.value }))}
                  placeholder="Candidate grade"
                  required
                />
              </label>

              <label>
                Issue Date
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))}
                  required
                />
              </label>
            </div>

            {!templates.length ? <p className="modal-help">Create a certificate template first before generating certificates.</p> : null}
            {!teams.length ? <p className="modal-help">Create a team first before generating certificates.</p> : null}
            {!categories.length ? <p className="modal-help">Create a category first before generating certificates.</p> : null}

            <div className="modal-actions">
              <button className="primary-btn" type="submit" disabled={!templates.length || !teams.length || !categories.length}>
                {modalMode === "edit" ? "Update Certificate" : "Create Certificate"}
              </button>
              <button className="secondary-btn" type="button" onClick={closeEditor}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h2>Delete Certificate Result?</h2>
            <p>This will permanently remove the certificate result for {deleting.candidateName || "this candidate"}.</p>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="danger-btn" type="button" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="modal-overlay">
          <div className="view-modal">
            <button className="close-btn" type="button" onClick={() => setViewing(null)} aria-label="Close">
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <h2>Certificate Preview</h2>
            <p className="modal-subtitle">View and download the generated certificate using the selected template.</p>
            {selectedViewTemplate ? (
              <div className="template-grid single-template-grid">
                <div className="template-card">
                  <h3>{selectedViewTemplate.name}</h3>
                  <div className="template-preview">
                    <CertificateCanvas
                      template={selectedViewTemplate}
                      result={viewing}
                      scale={Math.min(360 / Number(selectedViewTemplate.canvasWidth || selectedViewTemplate.canvas?.width || 842), 420 / Number(selectedViewTemplate.canvasHeight || selectedViewTemplate.canvas?.height || 596), 1)}
                      captureId={`${viewing.id}-${selectedViewTemplate.id}`}
                    />
                  </div>
                  <button className="primary-btn" type="button" onClick={() => downloadCertificate(selectedViewTemplate, viewing)}>
                    <Download size={18} strokeWidth={1.9} aria-hidden="true" />
                    Download Certificate
                  </button>
                </div>
              </div>
            ) : (
              <div className="template-empty-state">The selected certificate template is missing.</div>
            )}
            <div className="modal-actions">
              <button className="primary-btn" type="button" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
.certificate-results-page{min-height:100vh;overflow-x:hidden;background:var(--app-bg);color:var(--app-text);padding:32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.results-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;max-width:1532px;margin:0 auto 34px}.results-header>div{min-width:0}.results-header h1{margin:0 0 8px;font-size:32px;line-height:1.15;font-weight:800;color:var(--app-heading)}.results-header p{margin:0;color:var(--app-muted);font-size:22px;line-height:1.4;font-weight:500;overflow-wrap:anywhere}.primary-btn,.secondary-btn,.danger-btn{border:0;border-radius:8px;min-height:40px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap;box-shadow:var(--app-shadow-sm);transition:background .18s ease,color .18s ease,border-color .18s ease,opacity .18s ease}.primary-btn:disabled,.secondary-btn:disabled{cursor:not-allowed;opacity:.58}.primary-btn{background:var(--app-primary);color:var(--app-primary-text)}.primary-btn:hover{opacity:.92}.secondary-btn{background:var(--app-surface);color:var(--app-text);border:1px solid var(--app-border)}.secondary-btn:hover{background:var(--app-surface-elevated);color:var(--app-heading)}.danger-btn{background:var(--app-danger);color:var(--app-danger-text)}.danger-btn:hover{opacity:.9}.header-btn{min-height:48px;padding:0 22px;font-size:17px;background:var(--app-success);color:var(--app-success-text)}.filter-card{max-width:1532px;margin:0 auto 32px;background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;box-shadow:var(--app-shadow-sm);padding:24px;display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:18px}.certificate-results-page input,.certificate-results-page select{width:100%;height:44px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-input-bg);color:var(--app-text);padding:0 14px;font-size:15px;outline:none;box-shadow:var(--app-shadow-sm);box-sizing:border-box}.certificate-results-page input::placeholder{color:var(--app-muted)}.certificate-results-page input:focus,.certificate-results-page select:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-focus-ring)}.results-grid{max-width:1532px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:22px}.result-card{min-height:330px;background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;padding:28px;box-shadow:var(--app-shadow-sm);display:flex;flex-direction:column;min-width:0}.card-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.card-top h2{margin:0 0 4px;font-size:22px;line-height:1.2;font-weight:800;color:var(--app-heading);overflow-wrap:anywhere}.card-top p,.result-meta{color:var(--app-muted);font-size:15px}.card-top p{margin:0}.status-badge{border-radius:999px;padding:6px 12px;font-size:13px;line-height:1;font-weight:800;white-space:nowrap;background:var(--app-sidebar-active-bg);color:var(--app-sidebar-active-text)}.certificate-details{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 14px;margin-top:28px;font-size:15px}.certificate-details span{color:var(--app-muted);font-weight:700}.certificate-details strong{color:var(--app-heading);font-weight:700;overflow-wrap:anywhere}.result-meta{margin:24px 0 0}.card-actions{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:auto;padding-top:34px}.left-actions{display:flex;gap:8px;flex-wrap:wrap}.card-actions .secondary-btn{min-height:40px;font-size:16px;padding:0 14px}.view-btn{background:var(--app-trophy)!important;border-color:var(--app-trophy)!important;color:var(--app-trophy-text)!important}.view-btn:hover{opacity:.9}.delete-icon{border:0;background:transparent;color:var(--app-danger);width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px}.delete-icon:hover{background:var(--app-danger-bg-soft)}.empty-state{max-width:1532px;min-height:430px;margin:0 auto;border:1px dashed var(--app-border);border-radius:16px;background:var(--app-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--app-heading);padding:34px}.empty-icon{width:72px;height:72px;border-radius:50%;background:var(--app-surface-elevated);color:var(--app-muted);display:flex;align-items:center;justify-content:center;margin-bottom:22px}.empty-state h2{margin:0 0 12px;font-size:28px;font-weight:800;color:var(--app-heading)}.empty-state p{margin:0 0 34px;color:var(--app-muted);font-size:19px;max-width:680px}.empty-state .primary-btn{min-height:46px;font-size:17px;background:var(--app-success);color:var(--app-success-text)}.modal-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:28px;overflow-y:auto}.editor-modal,.view-modal,.confirm-modal{position:relative;background:var(--app-surface-elevated);color:var(--app-text);border:1px solid var(--app-border);border-radius:14px;box-shadow:var(--app-shadow-lg);width:min(100%,904px);max-height:calc(100vh - 56px);overflow:auto;padding:24px 28px 34px}.view-modal{width:min(100%,900px)}.confirm-modal{width:min(100%,420px);padding:28px}.close-btn{position:absolute;top:16px;right:16px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);color:var(--app-muted);cursor:pointer;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center}.close-btn:hover{color:var(--app-heading);background:var(--app-surface-elevated)}.editor-modal h2,.view-modal h2,.confirm-modal h2{margin:0 42px 6px 0;font-size:22px;font-weight:800;color:var(--app-heading)}.modal-subtitle,.confirm-modal p{margin:0 0 28px;color:var(--app-muted);font-size:16px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}.certificate-form-grid label:first-child{grid-column:1/-1}.certificate-results-page label{display:grid;gap:7px;color:var(--app-text);font-size:14px;font-weight:700;min-width:0}.modal-help{margin:12px 0 0;color:var(--app-muted);font-size:14px}.modal-actions{margin-top:22px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:34px}.single-template-grid{grid-template-columns:minmax(0,1fr)}.template-card{background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;min-height:520px;padding:28px 22px;display:flex;flex-direction:column;align-items:center;box-shadow:var(--app-shadow-sm);min-width:0}.template-card h3{align-self:stretch;margin:0 0 24px;font-size:22px;line-height:1.25;color:var(--app-heading);overflow-wrap:anywhere}.template-preview{width:100%;max-width:520px;min-height:360px;max-height:62vh;display:flex;align-items:center;justify-content:center;margin-bottom:24px;overflow:auto;border-radius:10px;background:var(--app-bg);padding:14px}.certificate-capture-wrapper{flex:0 0 auto;background:#fff;border:0;border-radius:0;color-scheme:light}.certificate-canvas{color-scheme:light}.certificate-fallback{height:100%;padding:70px 90px;color:#111827;background:#ececec;font-family:Arial,sans-serif}.certificate-fallback p{margin:10px 0;font-size:24px}.certificate-fallback h1{margin:42px 0 12px;font-size:52px}.certificate-fallback h2{margin:0 0 30px;font-size:30px}.certificate-fallback strong{display:block;margin-top:20px;font-size:24px}.certificate-fallback small{display:block;margin-top:48px;font-size:18px}.template-empty-state{margin:56px 0 20px;min-height:220px;border:1px dashed var(--app-border);border-radius:14px;background:var(--app-surface);color:var(--app-muted);display:flex;align-items:center;justify-content:center;text-align:center;font-size:20px;font-weight:600;padding:24px}@media(max-width:1100px){.results-header{flex-direction:column;margin-bottom:28px}.filter-card{grid-template-columns:1fr;padding:20px}.results-grid{grid-template-columns:1fr}.template-grid{grid-template-columns:1fr}.view-modal{width:min(100%,760px)}}@media(max-width:640px){.certificate-results-page{padding:20px}.results-header h1{font-size:28px}.results-header p{font-size:17px}.header-btn{width:100%;white-space:normal}.result-card{padding:20px;min-height:auto}.card-top{flex-direction:column}.card-actions{align-items:flex-start;flex-direction:column}.left-actions,.left-actions button,.modal-actions button{width:100%}.form-grid{grid-template-columns:1fr}.editor-modal,.view-modal,.confirm-modal{padding:22px 18px 28px}.modal-overlay{padding:16px}.template-card{padding:20px 14px}.template-preview{max-width:100%;min-height:260px}.primary-btn,.secondary-btn,.danger-btn{white-space:normal}}
      `}</style>
    </section>
  );
}
