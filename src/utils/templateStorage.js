import { getUserStorageKey } from "./storage.js";

export function createRankifyId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getStoredProgramTemplates() {
  try {
    const stored = localStorage.getItem(getUserStorageKey('rankify_program_templates'));
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    localStorage.removeItem(getUserStorageKey('rankify_program_templates'));
  }
  return [];
}

export function saveStoredProgramTemplates(templates) {
  localStorage.setItem(getUserStorageKey('rankify_program_templates'), JSON.stringify(templates));
  window.dispatchEvent(new Event('rankify-events-changed'));
  window.dispatchEvent(new Event('rankify-program-templates-changed'));
}
