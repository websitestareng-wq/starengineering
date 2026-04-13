export function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : "";
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePhone(phone: string) {
  return /^[0-9+\-\s()]{7,20}$/.test(phone.trim());
}

export function validatePan(pan: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

export function validateGstin(gstin: string) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(
    gstin.trim().toUpperCase(),
  );
}

export function derivePanFromGstin(gstin: string) {
  const value = gstin.trim().toUpperCase();
  if (value.length !== 15) return "";
  return value.slice(2, 12);
}

export function formatRoleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}