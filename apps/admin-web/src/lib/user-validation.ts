export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^[6-9]\d{9}$/;
export const gstinRegex =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function normalizeUpper(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

export type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  address: string;
  sendCredentials: boolean;
};

export function validateUserForm(
  values: UserFormValues,
  mode: "create" | "edit"
) {
  const errors: Partial<Record<keyof UserFormValues | "tax", string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (values.phone.trim() && !phoneRegex.test(values.phone.trim())) {
    errors.phone = "Phone must be a valid 10-digit Indian mobile number";
  }

  const gstin = normalizeUpper(values.gstin);
  const pan = normalizeUpper(values.pan);

  if (!gstin && !pan) {
    errors.tax = "Either GSTIN or PAN is required";
  }

  if (gstin && !gstinRegex.test(gstin)) {
    errors.gstin = "Invalid GSTIN format";
  }

  if (pan && !panRegex.test(pan)) {
    errors.pan = "Invalid PAN format";
  }
  return errors;
}