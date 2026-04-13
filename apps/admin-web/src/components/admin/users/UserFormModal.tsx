"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import type { PortalUser } from "@/types/user";
import {
  normalizeUpper,
  validateUserForm,
  type UserFormValues,
} from "@/lib/user-validation";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  loading?: boolean;
  user?: PortalUser | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
};

const initialValues: UserFormValues = {
  name: "",
  email: "",
  phone: "",
  gstin: "",
  pan: "",
  address: "",
  sendCredentials: false,
};

export default function UserFormModal({
  open,
  mode,
  loading = false,
  user,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<UserFormValues>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormValues | "tax", string>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [panManuallyEdited, setPanManuallyEdited] = useState(false);

  const title = useMemo(
    () => (mode === "create" ? "Create User" : "Edit User"),
    [mode]
  );

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && user) {
      setValues({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        gstin: user.gstin || "",
        pan: user.pan || "",
        address: user.address || "",
        sendCredentials: false,
      });
    } else {
      setValues(initialValues);
    }

    setErrors({});
    setShowPassword(false);
    setPanManuallyEdited(false);
  }, [open, mode, user]);

  useEffect(() => {
    if (panManuallyEdited) return;

    const gstin = values.gstin.trim().toUpperCase();

    if (gstin.length >= 12) {
      const derivedPan = gstin.slice(2, 12);

      setValues((prev) => {
        if (prev.pan === derivedPan) return prev;
        return {
          ...prev,
          pan: derivedPan,
        };
      });

      setErrors((prev) => ({
        ...prev,
        pan: "",
        tax: "",
      }));
    } else if (!panManuallyEdited && values.pan) {
      setValues((prev) => ({
        ...prev,
        pan: "",
      }));
    }
  }, [values.gstin, values.pan, panManuallyEdited]);

  if (!open) return null;

  const handleChange = (field: keyof UserFormValues, value: string | boolean) => {
    const nextValue =
      field === "gstin" || field === "pan"
        ? normalizeUpper(String(value))
        : value;

    if (field === "pan") {
      setPanManuallyEdited(true);
    }

    if (field === "gstin") {
      const nextGstin = String(nextValue).trim().toUpperCase();
      const currentAutoPan =
        values.gstin.trim().toUpperCase().length >= 12
          ? values.gstin.trim().toUpperCase().slice(2, 12)
          : "";

      if (!panManuallyEdited || values.pan === currentAutoPan || !values.pan) {
        setPanManuallyEdited(false);
      }

      setValues((prev) => ({
        ...prev,
        gstin: nextGstin,
      }));

      setErrors((prev) => ({
        ...prev,
        gstin: "",
        pan: "",
        tax: "",
      }));

      return;
    }

    setValues((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
      tax: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateUserForm(values, mode);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;
    await onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 px-4 py-5 backdrop-blur-[2px]">
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_26px_70px_rgba(124,58,237,0.16)]">
       <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "create"
                ? "Create a new customer portal user with optional credentials mail."
                : "Update user details and portal access information."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition duration-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[85vh] overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Name *
              </label>
              <input
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter full name"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
              />
              {errors.name && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email *
              </label>
              <input
                value={values.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="user@example.com"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
              />
              {errors.email && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Phone (Optional)
              </label>
              <input
                value={values.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="10-digit mobile number"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
              />
              {errors.phone && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                GSTIN
              </label>
              <input
                value={values.gstin}
                onChange={(e) => handleChange("gstin", e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm uppercase text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
              />
              {errors.gstin && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {errors.gstin}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                PAN
              </label>
              <input
                value={values.pan}
                onChange={(e) => handleChange("pan", e.target.value)}
                placeholder="AAAAA0000A"
                maxLength={10}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm uppercase text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
              />
              {errors.pan && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {errors.pan}
                </p>
              )}
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                GSTIN bharne par PAN auto-fill hoga, but aap manually change bhi kar
                sakte ho.
              </p>
            </div>
          </div>

          {errors.tax && (
            <p className="mt-3 text-sm font-medium text-amber-700">
              {errors.tax}
            </p>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Address (Optional)
            </label>
            <textarea
  rows={4}
  value={values.address}
  onChange={(e) => handleChange("address", e.target.value)}
  placeholder="Enter full one-line address"
  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)] font-[Arial]"
/>
            {errors.address && (
              <p className="mt-1 text-xs font-medium text-rose-600">
                {errors.address}
              </p>
            )}
          </div>

          {mode === "create" && (
<div className="mt-5 rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,1),rgba(250,245,255,0.98))] p-4">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-slate-900">
        Send Credentials Email
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Default off. When enabled, welcome credentials mail will be sent via
        Resend from{" "}
        <span className="font-semibold">
          noreply@mail.stareng.co.in
        </span>
        .
      </p>
    </div>

    <div className="flex justify-end sm:justify-start">
      <button
        type="button"
        onClick={() =>
          handleChange("sendCredentials", !values.sendCredentials)
        }
        className={`relative h-7 w-14 shrink-0 rounded-full transition duration-300 ${
          values.sendCredentials ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition duration-300 ${
            values.sendCredentials ? "left-8" : "left-1"
          }`}
        />
      </button>
    </div>
  </div>
</div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(167,139,250,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(167,139,250,0.28)] disabled:opacity-60"
            >
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create User"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}