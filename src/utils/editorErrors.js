export function categorizeEditorError(error, defaultNotFoundTitle = "Template not found") {
  const msg = (error?.message || "").toLowerCase();
  const code = (error?.code || "").toLowerCase();

  if (
    code.includes("permission-denied") ||
    code.includes("unauthorized") ||
    msg.includes("permission") ||
    msg.includes("insufficient") ||
    msg.includes("unauthorized") ||
    msg.includes("access denied")
  ) {
    return {
      type: "permission-denied",
      title: "Missing or insufficient permissions",
      description: "You do not have permission to view or edit this template.",
      details: error?.message || "Missing or insufficient permissions.",
    };
  }

  if (
    code.includes("not-found") ||
    code === "not_found" ||
    msg.includes("not found") ||
    msg.includes("does not exist")
  ) {
    return {
      type: "not-found",
      title: defaultNotFoundTitle,
      description: "The requested template could not be found. It may have been deleted or moved.",
      details: error?.message || "Template not found.",
    };
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("connection")
  ) {
    return {
      type: "network",
      title: "Network Connection Error",
      description: "Unable to reach the server. Please check your network connection and retry.",
      details: error?.message || "Network request failed.",
    };
  }

  return {
    type: "error",
    title: "Unable to load template",
    description: "An error occurred while loading this template.",
    details: error?.message || "Error loading template.",
  };
}
