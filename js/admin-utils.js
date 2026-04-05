export function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
}

export function toDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    const dateValue = value.toDate();
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

export function formatLastActive(value) {
  const dateValue = toDate(value);
  if (!dateValue) return "-";

  const diffMs = Date.now() - dateValue.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diffMs < hour) return "Within 1 hour";
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}
