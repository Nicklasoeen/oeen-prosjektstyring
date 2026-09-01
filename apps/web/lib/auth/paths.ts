export function safeNextPath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

export function isWorkspacePath(value: string) {
  return /^\/w\/[a-z0-9-]+(\/[\w\-./]*)?$/i.test(safeNextPath(value));
}
