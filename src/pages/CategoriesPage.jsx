import React, { useEffect, useMemo, useState } from "react";
import { Edit, FolderOpen, Plus, Trash2, X } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { getEvents } from "../services/eventsService.js";
import { resolveActiveEventFromEventsForCurrentUser } from "../services/activeEventService.js";
import { DASHBOARD_CACHE_EVENT } from "../services/dashboardCache.js";
import { createCategory, deleteCategory, getCategoriesByEvent, updateCategory } from "../services/categoriesService.js";

const sahityolsavCategories = [
  "Lower primary",
  "Upper primary",
  "High school",
  "Higher secondary",
  "Junior",
  "Senior",
  "General",
];

export default function CategoriesPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [categoriesByEvent, setCategoriesByEvent] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function syncFromSupabase(options = {}) {
    setLoading(true);
    setError("");
    try {
      const storedEvents = await getEvents(options);
      const { activeEventId: validActiveId } = await resolveActiveEventFromEventsForCurrentUser(storedEvents);
      const eventCategories = validActiveId ? await getCategoriesByEvent(validActiveId, options) : [];

      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setCategoriesByEvent(validActiveId ? { [validActiveId]: eventCategories } : {});
    } catch (loadError) {
      setError(loadError.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    syncFromSupabase();
    const syncFromCache = () => syncFromSupabase({ background: false });

    window.addEventListener("storage", syncFromSupabase);
    window.addEventListener("rankify-active-event-changed", syncFromSupabase);
    window.addEventListener(DASHBOARD_CACHE_EVENT, syncFromCache);
    return () => {
      window.removeEventListener("storage", syncFromSupabase);
      window.removeEventListener("rankify-active-event-changed", syncFromSupabase);
      window.removeEventListener(DASHBOARD_CACHE_EVENT, syncFromCache);
    };
  }, []);

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) || null,
    [activeEventId, events]
  );

  const visibleCategories = useMemo(
    () => (activeEventId ? categoriesByEvent[activeEventId] || [] : []),
    [activeEventId, categoriesByEvent]
  );

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function setCategoriesForActiveEvent(nextCategories) {
    if (!activeEventId) return;
    setCategoriesByEvent((current) => ({ ...current, [activeEventId]: nextCategories }));
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function openCreateModal() {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    setEditingCategory(null);
    setCategoryName("");
    setModalOpen(true);
  }

  function openEditModal(category) {
    setEditingCategory(category);
    setCategoryName(category.name || "");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCategory(null);
    setCategoryName("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!categoryName.trim()) {
      alert("Category name is required");
      return;
    }

    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const currentCategories = categoriesByEvent[activeEventId] || [];

    try {
      if (editingCategory) {
        const updatedCategory = await updateCategory(editingCategory.id, { name: categoryName.trim() });
        setCategoriesForActiveEvent(
          currentCategories.map((category) => (category.id === editingCategory.id ? updatedCategory : category))
        );
      } else {
        const newCategory = await createCategory(activeEventId, { name: categoryName.trim() });
        setCategoriesForActiveEvent([newCategory, ...currentCategories]);
      }
      closeModal();
    } catch (saveError) {
      setError(saveError.message || "Unable to save category.");
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!activeEventId) return;

    const confirmed = window.confirm("Are you sure you want to delete this category?");
    if (!confirmed) return;

    try {
      await deleteCategory(categoryId);
      const currentCategories = categoriesByEvent[activeEventId] || [];
      setCategoriesForActiveEvent(currentCategories.filter((category) => category.id !== categoryId));
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete category.");
    }
  }

  async function handleAddSahityolsavCategories() {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const currentCategories = categoriesByEvent[activeEventId] || [];
    const existingNames = new Set(currentCategories.map((category) => category.name.toLowerCase()));
    const namesToAdd = sahityolsavCategories.filter((name) => !existingNames.has(name.toLowerCase()));

    if (namesToAdd.length === 0) {
      showToast("Sahityolsav categories added successfully!");
      return;
    }

    try {
      const createdCategories = [];
      for (const name of namesToAdd) {
        createdCategories.push(await createCategory(activeEventId, { name }));
      }
      setCategoriesForActiveEvent([...createdCategories, ...currentCategories]);
      showToast("Sahityolsav categories added successfully!");
    } catch (saveError) {
      setError(saveError.message || "Unable to add categories.");
    }
  }

  return (
    <div className="app-page overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="app-heading text-2xl font-bold tracking-tight">
              Manage Categories
            </h1>
            <p className="app-muted mt-1">
              View, create, edit, and delete categories for event:{" "}
              <span className="font-semibold">
                {activeEvent?.name || "No active event"}
              </span>
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!activeEventId}
              className="app-success-btn inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm hover:opacity-90"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Create New Category
            </button>
            <button
              type="button"
              onClick={handleAddSahityolsavCategories}
              disabled={!activeEventId}
              className="app-card h-10 max-w-full rounded-md border px-5 text-sm font-semibold shadow-sm hover:bg-[var(--app-surface-elevated)]"
            >
              Add Sahityolsav Categories
            </button>
          </div>
        </div>

        {error && (
          <div className="app-card rounded-lg border border-[var(--app-danger)] p-4 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        )}

        {!activeEventId ? (
          <NoActiveEventState />
        ) : loading && visibleCategories.length === 0 ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading categories...</p>
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-surface-elevated)] text-[var(--app-muted)]">
              <FolderOpen size={42} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2 className="app-heading text-xl font-bold">No Categories Yet</h2>
            <p className="app-muted mt-3 max-w-[640px]">
              You haven't created any categories yet. Get started by creating
              your first one!
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="app-success-btn mt-8 inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-semibold shadow-sm hover:opacity-90"
            >
              Create Your First Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCategories.map((category) => (
              <div
                key={category.id}
                className="app-card flex min-h-[160px] flex-col rounded-xl border p-6 shadow-sm"
              >
                <div>
                  <h2 className="app-heading text-lg font-bold">
                    {category.name}
                  </h2>
                  <p className="app-muted mt-2 text-sm">
                    Created: {category.createdAt}
                  </p>
                </div>

                <div className="mt-auto flex justify-end gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => openEditModal(category)}
                    className="app-text inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
                  >
                    <Edit size={16} strokeWidth={1.9} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="app-danger-btn inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold hover:opacity-90"
                  >
                    <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="app-modal relative w-full max-w-[520px] rounded-xl p-6 shadow-2xl max-sm:max-w-[calc(100vw-24px)] max-sm:p-5">
            <button
              type="button"
              onClick={closeModal}
              className="app-muted absolute right-4 top-4 text-2xl leading-none hover:text-[var(--app-heading)]"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>

            <h2 className="app-heading text-xl font-bold">
              {editingCategory ? "Edit Category" : "Create New Category"}
            </h2>
            <p className="app-muted mt-1 max-w-[410px] text-sm">
              {editingCategory
                ? "Make changes to your category here. Click save when you're done."
                : "Create a new category to organize your templates."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading min-w-0 text-sm font-medium">
                  Name
                </label>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="eg., Junior"
                  autoFocus
                  className="app-input h-10 w-full max-w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="app-card h-10 rounded-md border px-4 text-sm font-medium hover:bg-[var(--app-surface-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-success-btn h-10 rounded-md px-4 text-sm font-semibold hover:opacity-90"
                >
                  {editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="app-modal fixed bottom-7 right-7 z-[9999] rounded-md border px-5 py-4 text-sm font-semibold shadow-xl">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-heading)] text-xs text-[var(--app-bg)]">
            ✓
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

