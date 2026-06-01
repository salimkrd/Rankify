import React, { useEffect, useMemo, useState } from "react";
import { Edit, FolderOpen, Plus, Trash2, X } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const CATEGORIES_KEY = "rankify_categories";

const fallbackEvents = [
  {
    id: "event_panangara",
    name: "SSF PANANGARA UNIT SAHITYOLSAV",
    organizer: "Panangara Unit",
    date: "May 25",
    location: "Panangara",
    created: "5/24/2026",
  },
  {
    id: "event_cherikallu",
    name: "SSF CHERIKALLU UNIT SAHITYOLSAV",
    organizer: "Cherikallu Unit",
    date: "May 22",
    location: "Nambram",
    created: "5/22/2026",
  },
];

const sahityolsavCategories = [
  "Lower primary",
  "Upper primary",
  "High school",
  "Higher secondary",
  "Junior",
  "Senior",
  "General",
];

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getStoredEvents() {
  const storedEvents = safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []);
  return Array.isArray(storedEvents) ? storedEvents : [];
}

function getStoredCategories() {
  const storedCategories = safeJsonParse(localStorage.getItem(getUserStorageKey(CATEGORIES_KEY)), {});
  return storedCategories &&
    typeof storedCategories === "object" &&
    !Array.isArray(storedCategories)
    ? storedCategories
    : {};
}

function getValidActiveEventId(events) {
  const storedActiveId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY));
  const isValid = events.some((event) => event.id === storedActiveId);

  if (isValid) {
    return storedActiveId;
  }

  const firstEventId = events[0]?.id || "";

  if (firstEventId) {
    localStorage.setItem(ACTIVE_EVENT_KEY, firstEventId);
  } else {
    localStorage.removeItem(ACTIVE_EVENT_KEY);
  }

  return firstEventId;
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

export default function CategoriesPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [categoriesByEvent, setCategoriesByEvent] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    function syncFromLocalStorage() {
      const storedEvents = getStoredEvents();
      const validActiveId = getValidActiveEventId(storedEvents);
      const storedCategories = getStoredCategories();

      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setCategoriesByEvent(storedCategories);
    }

    syncFromLocalStorage();

    window.addEventListener("storage", syncFromLocalStorage);
    window.addEventListener("rankify-active-event-changed", syncFromLocalStorage);

    return () => {
      window.removeEventListener("storage", syncFromLocalStorage);
      window.removeEventListener(
        "rankify-active-event-changed",
        syncFromLocalStorage
      );
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

  function persistCategoriesForActiveEvent(nextCategories) {
    if (!activeEventId) return;

    const storedCategories = getStoredCategories();
    const updatedCategoriesByEvent = {
      ...storedCategories,
      [activeEventId]: nextCategories,
    };

    localStorage.setItem(getUserStorageKey(CATEGORIES_KEY), JSON.stringify(updatedCategoriesByEvent));
    setCategoriesByEvent(updatedCategoriesByEvent);
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function openCreateModal() {
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

  function handleSubmit(event) {
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

    if (editingCategory) {
      const updatedCategories = currentCategories.map((category) =>
        category.id === editingCategory.id
          ? { ...category, name: categoryName.trim() }
          : category
      );

      persistCategoriesForActiveEvent(updatedCategories);
      closeModal();
      return;
    }

    const newCategory = {
      id: `category_${Date.now()}`,
      name: categoryName.trim(),
      createdAt: today(),
    };

    persistCategoriesForActiveEvent([...currentCategories, newCategory]);
    closeModal();
  }

  function handleDeleteCategory(categoryId) {
    if (!activeEventId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );
    if (!confirmed) return;

    const currentCategories = categoriesByEvent[activeEventId] || [];
    const updatedCategories = currentCategories.filter(
      (category) => category.id !== categoryId
    );

    persistCategoriesForActiveEvent(updatedCategories);
  }

  function handleAddSahityolsavCategories() {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const currentCategories = categoriesByEvent[activeEventId] || [];
    const existingNames = new Set(
      currentCategories.map((category) => category.name.toLowerCase())
    );

    const categoriesToAdd = sahityolsavCategories
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name, index) => ({
        id: `category_${Date.now()}_${index}`,
        name,
        createdAt: today(),
      }));

    if (categoriesToAdd.length === 0) {
      showToast("Sahityolsav categories added successfully!");
      return;
    }

    persistCategoriesForActiveEvent([...currentCategories, ...categoriesToAdd]);
    showToast("Sahityolsav categories added successfully!");
  }

  return (
    <div className="overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">
              Manage Categories
            </h1>
            <p className="mt-1 text-gray-600">
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Create New Category
            </button>
            <button
              type="button"
              onClick={handleAddSahityolsavCategories}
              className="h-10 max-w-full rounded-md border border-gray-200 bg-white px-5 text-sm font-semibold text-[#0D1B2A] shadow-sm hover:bg-gray-50"
            >
              Add Sahityolsav Categories
            </button>
          </div>
        </div>

        {visibleCategories.length === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <FolderOpen size={42} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-[#0D1B2A]">No Categories Yet</h2>
            <p className="mt-3 max-w-[640px] text-gray-600">
              You haven't created any categories yet. Get started by creating
              your first one!
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-[#26752C] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
            >
              Create Your First Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCategories.map((category) => (
              <div
                key={category.id}
                className="flex min-h-[160px] flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#0D1B2A]">
                    {category.name}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Created: {category.createdAt}
                  </p>
                </div>

                <div className="mt-auto flex justify-end gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => openEditModal(category)}
                    className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
                  >
                    <Edit size={16} strokeWidth={1.9} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
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
          <div className="relative w-full max-w-[520px] rounded-xl bg-white p-6 shadow-2xl max-sm:max-w-[calc(100vw-24px)] max-sm:p-5">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 text-2xl leading-none text-gray-500 hover:text-gray-900"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>

            <h2 className="text-xl font-bold text-[#0D1B2A]">
              {editingCategory ? "Edit Category" : "Create New Category"}
            </h2>
            <p className="mt-1 max-w-[410px] text-sm text-gray-500">
              {editingCategory
                ? "Make changes to your category here. Click save when you're done."
                : "Create a new category to organize your templates."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="min-w-0 text-sm font-medium text-[#0D1B2A]">
                  Name
                </label>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="eg., Junior"
                  autoFocus
                  className="h-10 w-full max-w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white hover:bg-[#1f6425]"
                >
                  {editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-7 right-7 z-[9999] rounded-md border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-[#0D1B2A] shadow-xl">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0D1B2A] text-xs text-white">
            ✓
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
