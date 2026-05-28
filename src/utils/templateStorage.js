export function createRankifyId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getStoredProgramTemplates() {
  try {
    const stored = localStorage.getItem('rankify_program_templates');
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    localStorage.removeItem('rankify_program_templates');
  }
  return [];
}

export function saveStoredProgramTemplates(templates) {
  localStorage.setItem('rankify_program_templates', JSON.stringify(templates));
  window.dispatchEvent(new Event('rankify-events-changed'));
  window.dispatchEvent(new Event('rankify-program-templates-changed'));
}
