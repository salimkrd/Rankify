import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, FileText, Plus, Trash2, X } from "lucide-react";
import TeamStatusTemplatePreview from "../components/TeamStatusTemplatePreview";
import { getUserStorageKey } from "../utils/storage.js";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const STORAGE_KEY = "rankify_team_status_templates";

const publicTemplates = [
  {
    id: "public_team_status_01",
    name: "Public Template 01",
    elementsCount: 6,
    teamScoresCount: 10,
    source: "public",
    type: "team-status",
    variant: "light",
  },
  {
    id: "public_team_status_02",
    name: "Public Template 2",
    elementsCount: 6,
    teamScoresCount: 10,
    source: "public",
    type: "team-status",
    variant: "green",
  },
];

function publicBackgroundImage(variant = "green") {
  const isLight = variant === "light";
  const background = isLight
    ? `<rect width="1080" height="1350" fill="#ffffff"/><path d="M0 0 C420 160 600 20 1080 160 V1350 H0Z" fill="#f6f3ed"/><path d="M90 960 C170 760 210 620 170 430" stroke="#4E0D65" stroke-width="18" fill="none"/><g fill="#6D1684"><ellipse cx="122" cy="830" rx="42" ry="18" transform="rotate(-35 122 830)"/><ellipse cx="185" cy="720" rx="42" ry="18" transform="rotate(-35 185 720)"/><ellipse cx="230" cy="610" rx="42" ry="18" transform="rotate(-35 230 610)"/></g>`
    : `<defs><radialGradient id="g" cx="72%" cy="30%" r="72%"><stop stop-color="#0c6a50"/><stop offset="1" stop-color="#063a55"/></radialGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><path d="M620 260 C780 120 1050 160 1220 360" stroke="#2c7b1f" stroke-width="92" fill="none" opacity=".75"/><path d="M660 360 C820 230 1030 280 1190 470" stroke="#2458a2" stroke-width="78" fill="none" opacity=".7"/><circle cx="760" cy="775" r="150" fill="#48b8e8" opacity=".78"/><rect x="0" y="0" width="1080" height="1350" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="20"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${background}<text x="110" y="1200" font-family="Arial" font-size="42" font-weight="700" fill="${isLight ? "#111827" : "#ffffff"}">Sahityolsav</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value).flat();
  return [];
}

function getEvents() {
  return asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []));
}

function getActiveEvent(events) {
  const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  return (
    events.find((event) => String(event.id) === String(activeEventId)) ||
    events[0] || {
      id: activeEventId || "default",
      name: "Active Event",
    }
  );
}

function getTemplatesByEvent() {
  const stored = safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), {});
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

function newTemplateId() {
  return `team_status_template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultTitle(id, text, x, y, color = "#ffffff") {
  return {
    id,
    kind: "title",
    label: text,
    dataSource: "manual",
    text,
    x,
    y,
    width: 360,
    fontFamily: "Inter",
    fontSize: 52,
    fontWeight: "500",
    align: "left",
    color,
    lineHeight: 1.2,
    showBg: false,
  };
}

function defaultSlot(index) {
  return {
    id: `slot_${index}_${Math.random().toString(36).slice(2, 7)}`,
    kind: "teamSlot",
    label: `Slot ${index}`,
    teamIndex: index - 1,
    x: 100,
    y: 250 + (index - 1) * 42,
    width: 360,
    spacing: 0,
    horizontalAlign: "left",
    verticalAlign: "top",
    name: {
      x: 0,
      y: 0,
      width: 230,
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: "800",
      align: "left",
      color: "#ffffff",
      lineHeight: 1.2,
      showBg: false,
    },
    score: {
      x: 205,
      y: 0,
      width: 90,
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: "800",
      align: "left",
      color: "#eaff00",
      lineHeight: 1.2,
      showBg: false,
    },
  };
}

function publicEditableSchema(template) {
  const isLight = template.variant === "light";
  const backgroundImage = publicBackgroundImage(template.variant);
  return {
    canvas: {
      width: 1080,
      height: 1350,
      backgroundImage,
      backgroundColor: isLight ? "#ffffff" : "#07543F",
    },
    elements: [
      defaultTitle("title_final", "Final", 110, 120, isLight ? "#4E0D65" : "#ffffff"),
      defaultTitle("title_point", "Point", 110, 180, isLight ? "#4E0D65" : "#ffffff"),
      defaultTitle("title_status", "Status", 110, 240, isLight ? "#4E0D65" : "#ffffff"),
      defaultSlot(1),
      defaultSlot(2),
      defaultSlot(3),
      defaultSlot(4),
    ],
    previewData: {
      eventName: "",
      organizerName: "",
      eventDate: "",
      eventLocation: "",
      titleParts: ["Final", "Point", "Status"],
      teams: [
        { name: "Nullamkulam", score: "581" },
        { name: "Parappanangadi", score: "581" },
        { name: "Hidayah Nagar", score: "580" },
        { name: "Ottummal South", score: "579" },
      ],
    },
  };
}

function createTemplateFromPublic(template, activeEventId) {
  const now = today();
  const schema = publicEditableSchema(template);
  return {
    id: newTemplateId(),
    eventId: activeEventId,
    name: `${template.name} (from Public)`,
    previewImage: template.previewImage || schema.canvas.backgroundImage,
    elementsCount: template.elementsCount,
    teamScoresCount: template.teamScoresCount,
    createdAt: now,
    updatedAt: now,
    source: template.source,
    type: "team-status",
    variant: template.variant,
    canvas: schema.canvas,
    elements: schema.elements,
    previewData: schema.previewData,
  };
}

function Preview({ variant = "green" }) {
  return (
    <div className={`team-status-preview ${variant}`}>
      {variant === "light" ? (
        <>
          <div className="preview-logo dark" />
          <div className="preview-flower" />
          <div className="preview-signature dark" />
        </>
      ) : (
        <>
          <div className="preview-logo" />
          <div className="preview-scores">
            <span>Team Alpha 150</span>
            <span>Team Beta 120</span>
            <span>Team Gamma 90</span>
          </div>
          <div className="preview-lantern" />
          <div className="preview-signature" />
        </>
      )}
    </div>
  );
}

function SchemaPreview({ template }) {
  const canvas = template.canvas || {};
  const width = Number(canvas.width || 1080);
  const height = Number(canvas.height || 1080);
  const scale = Math.min(300 / width, 375 / height, 1);

  return (
    <div className="schema-preview-outer" style={{ width: width * scale, height: height * scale }}>
      <TeamStatusTemplatePreview template={template} scale={scale} />
    </div>
  );
}

export default function TeamStatusTemplatesPage() {
  const navigate = useNavigate();
  const [activeEvent, setActiveEvent] = useState({ id: "default", name: "Active Event" });
  const [templatesByEvent, setTemplatesByEvent] = useState({});
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    function load() {
      const events = getEvents();
      setActiveEvent(getActiveEvent(events));
      setTemplatesByEvent(getTemplatesByEvent());
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

  const templates = useMemo(
    () => (activeEvent.id ? templatesByEvent[activeEvent.id] || [] : []),
    [activeEvent.id, templatesByEvent]
  );

  function persist(nextTemplates) {
    const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || activeEvent.id;
    if (!activeEventId) return;

    const stored = getTemplatesByEvent();
    const updated = {
      ...stored,
      [activeEventId]: nextTemplates,
    };

    localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify(updated));
    setTemplatesByEvent(updated);
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function handleCreate() {
    navigate("/dashboard/team-status-templates/new");
  }

  function handleUsePublic(template) {
    const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || activeEvent.id;
    const currentTemplates = templatesByEvent[activeEventId] || [];
    persist([...currentTemplates, createTemplateFromPublic(template, activeEventId)]);
    setPublicModalOpen(false);
    showToast("Public template used successfully!");
  }

  function handleDuplicate(template) {
    const now = today();
    persist([
      ...templates,
      {
        ...template,
        id: newTemplateId(),
        eventId: activeEvent.id,
        name: `${template.name} Copy`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  function handleDelete(templateId) {
    const confirmed = window.confirm("Are you sure you want to delete this template?");
    if (!confirmed) return;
    persist(templates.filter((template) => template.id !== templateId));
  }

  return (
    <section className="team-status-page">
      <style>{styles}</style>

      <div className="team-status-header">
        <h1>Team Status Templates for {activeEvent.name}</h1>
        <div className="header-actions">
          <button type="button" className="primary-btn" onClick={handleCreate}>
            <Plus size={18} />
            Create New Template
          </button>
          <button type="button" className="primary-btn" onClick={() => setPublicModalOpen(true)}>
            Explore Public Templates
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FileText size={28} />
          </div>
          <h2>No Team Status Templates Yet</h2>
          <p>You haven't created any team status templates yet. Get started by creating your first one!</p>
          <button type="button" className="primary-btn" onClick={handleCreate}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.id}>
              <div className="template-preview-wrap">
                {template.canvas && template.elements ? (
                  <SchemaPreview template={template} />
                ) : template.previewImage ? (
                  <img src={template.previewImage} alt="" />
                ) : (
                  <Preview variant={template.variant || "green"} />
                )}
              </div>
              <div className="template-body">
                <h2>{template.name}</h2>
                <p>
                  Elements: {template.elementsCount || 6} titles, {template.teamScoresCount || 10} team scores
                </p>
                <span>Created: {template.createdAt || today()}</span>
                <div className="card-actions">
                  <button type="button" className="secondary-btn" onClick={() => handleDuplicate(template)}>
                    <Copy size={17} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => navigate(`/dashboard/team-status-templates/${template.id}/edit`)}
                  >
                    <Edit size={17} />
                    Edit
                  </button>
                  <button type="button" className="delete-btn" onClick={() => handleDelete(template.id)}>
                    <Trash2 size={17} />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {publicModalOpen && (
        <div className="modal-overlay">
          <div className="public-modal">
            <button type="button" className="close-btn" onClick={() => setPublicModalOpen(false)} aria-label="Close modal">
              <X size={18} />
            </button>
            <h2>Explore Public Team Status Templates</h2>
            <div className="public-grid">
              {publicTemplates.map((template) => (
                <article className="public-card" key={template.id}>
                  <Preview variant={template.variant} />
                  <div className="public-body">
                    <h3>{template.name}</h3>
                    <button type="button" className="use-btn" onClick={() => handleUsePublic(template)}>
                      USE
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </section>
  );
}

const styles = `
.team-status-page{min-height:100vh;background:var(--app-bg);padding:28px 26px 48px;color:var(--app-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
.team-status-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:32px}
.team-status-header h1{margin:0;font-size:28px;line-height:1.2;font-weight:800;color:var(--app-heading);overflow-wrap:anywhere}
.header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0}
.primary-btn{min-height:38px;border:0;border-radius:6px;background:var(--app-success);color:var(--app-success-text);padding:8px 18px;display:inline-flex;align-items:center;justify-content:center;gap:10px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:var(--app-shadow-sm);max-width:100%;white-space:normal;text-align:center}
.primary-btn:hover{filter:brightness(.95)}
.templates-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),516px));gap:24px;max-width:100%}
.template-card,.public-card{overflow:hidden;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);box-shadow:var(--app-shadow-sm);min-width:0}
.template-preview-wrap{height:418px;background:var(--app-surface-elevated);display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--app-border)}
.template-preview-wrap img{width:100%;height:100%;object-fit:contain}
.schema-preview-outer{position:relative;overflow:hidden}.schema-preview-inner{position:relative;overflow:hidden;background-size:cover;background-position:center;transform-origin:top left}.schema-preview-text,.schema-preview-slot,.schema-preview-slot span{position:absolute;box-sizing:border-box;white-space:pre-wrap}.schema-preview-slot span{display:block}
.template-body{padding:44px 18px 26px}
.template-body h2{margin:0 0 4px;font-size:22px;line-height:1.25;font-weight:800;color:var(--app-heading)}
.template-body p{margin:0 0 18px;color:var(--app-text);font-size:16px}
.template-body span{display:block;color:var(--app-muted);font-size:14px}
.card-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:62px;flex-wrap:wrap}
.secondary-btn,.text-btn,.delete-btn{min-height:34px;border:0;border-radius:6px;background:transparent;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;font-size:16px;cursor:pointer}
.secondary-btn{border:1px solid var(--app-border);background:var(--app-surface-elevated);color:var(--app-heading);box-shadow:var(--app-shadow-sm)}
.text-btn{color:var(--app-heading)}
.delete-btn{color:var(--app-danger)}
.empty-state{min-height:560px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.empty-icon{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--app-surface-elevated);color:var(--app-muted);margin-bottom:20px}
.empty-state h2{margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;color:var(--app-heading)}
.empty-state p{margin:0 0 28px;color:var(--app-text);font-size:16px}
.modal-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:94px 24px;overflow-y:auto}
.public-modal{position:relative;width:min(100%,546px);min-height:720px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface-elevated);padding:22px 26px;box-shadow:var(--app-shadow-lg)}
.close-btn{position:absolute;right:12px;top:14px;width:26px;height:26px;border:1px solid var(--app-success);border-radius:6px;background:var(--app-surface);color:var(--app-text);display:flex;align-items:center;justify-content:center;cursor:pointer}
.public-modal h2{margin:0 38px 16px 0;font-size:21px;line-height:1.3;font-weight:800;color:var(--app-heading)}
.public-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.public-card{border-radius:10px}
.public-card .team-status-preview{width:100%;height:310px;border-radius:0;box-shadow:none}
.public-body{padding:44px 18px}
.public-body h3{margin:0 0 20px;font-size:21px;line-height:1.25;font-weight:800;color:var(--app-heading)}
.use-btn{width:100%;height:34px;border:0;border-radius:6px;background:var(--app-success);color:var(--app-success-text);font-size:16px;font-weight:800;cursor:pointer}
.use-btn:hover{filter:brightness(.95)}
.team-status-preview{position:relative;width:300px;height:375px;overflow:hidden;background:#07543F;border-radius:0;box-shadow:0 1px 2px rgba(15,23,42,.12)}
.team-status-preview.green{background:radial-gradient(circle at 70% 10%,rgba(255,255,255,.16),transparent 35%),linear-gradient(135deg,#064C39,#086247)}
.team-status-preview.green:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.16) 1px,transparent 1px);background-size:8px 8px;opacity:.45}
.team-status-preview.light{background:radial-gradient(circle at 50% 20%,rgba(255,255,255,.92),rgba(245,245,240,.92) 34%,#fff 68%)}
.preview-logo{position:absolute;right:62px;top:54px;width:24px;height:34px;border:2px solid #fff;border-radius:4px}
.preview-logo.dark{right:48px;top:44px;border-color:#111}
.preview-scores{position:absolute;left:36px;top:98px;display:grid;gap:6px;color:#fff;font-size:11px;font-weight:800}
.preview-lantern{position:absolute;left:-42px;bottom:-34px;width:176px;height:176px;border-radius:50%;background:repeating-radial-gradient(circle,#f6f1e4 0 7px,#d9d4c6 8px 10px);border:1px solid rgba(0,0,0,.18)}
.preview-lantern:after{content:"";position:absolute;left:42px;top:28px;width:80px;height:96px;background:linear-gradient(135deg,transparent 15%,#0B5B42 16% 18%,transparent 19% 40%,#0B5B42 41% 43%,transparent 44%)}
.preview-flower{position:absolute;left:14px;bottom:72px;width:120px;height:160px;border-left:3px solid #3D054F;transform:rotate(-22deg)}
.preview-flower:before,.preview-flower:after{content:"";position:absolute;width:34px;height:20px;border-radius:70% 0 70% 0;background:#6D1684;box-shadow:24px -34px 0 #6D1684,48px -70px 0 #6D1684,64px -104px 0 #6D1684}
.preview-flower:after{left:14px;transform:scaleX(-1);background:#4E0D65;box-shadow:24px -34px 0 #4E0D65,48px -70px 0 #4E0D65,64px -104px 0 #4E0D65}
.preview-signature{position:absolute;right:86px;bottom:90px;width:54px;height:14px;border-bottom:2px solid rgba(255,255,255,.85);transform:rotate(-8deg)}
.preview-signature.dark{right:62px;bottom:118px;border-color:#111}
.toast{position:fixed;right:24px;bottom:26px;z-index:60;min-width:380px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);padding:18px 20px;display:flex;align-items:center;gap:12px;color:var(--app-heading);font-size:14px;font-weight:700;box-shadow:var(--app-shadow-lg)}
.toast span{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--app-heading);color:var(--app-bg);font-size:12px}
@media(max-width:900px){.team-status-page{padding:24px 16px 42px}.team-status-header{flex-direction:column}.header-actions{flex-wrap:wrap}.public-grid{grid-template-columns:1fr}.public-modal{min-height:0}.modal-overlay{align-items:center;padding:24px 12px}.templates-grid{grid-template-columns:1fr}.template-preview-wrap{height:340px}.toast{left:12px;right:12px;bottom:16px;min-width:0}.card-actions{justify-content:flex-start}}
`;
