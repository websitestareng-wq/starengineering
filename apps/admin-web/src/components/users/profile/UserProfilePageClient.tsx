"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import GlobalPageLoader from "@/components/admin/GlobalPageLoader";

type UserProfile = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  pan?: string | null;
  lastPasswordChangedAt?: string | null;
};

type ModalStep =
  | null
  | "address-enable-confirm"
  | "address-save-confirm"
  | "password-enable-confirm"
  | "password-current"
  | "password-new"
  | "password-save-confirm"
  | "success";

function getAccessToken() {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem("accessToken") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("authToken") ||
    window.localStorage.getItem("adminToken") ||
    ""
  );
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.94))] p-5 shadow-[0_18px_46px_rgba(124,58,237,0.08)]">
      <div className="absolute left-0 top-0 h-24 w-24 rounded-full bg-fuchsia-100/30 blur-3xl" />
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-100/30 blur-3xl" />

      <div className="relative">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <h2 className="text-[1.3rem] font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="mt-1.5 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
        {value}
      </div>
    </div>
  );
}

function PasswordDisplayBlock({
  onEdit,
  disabled,
  nextDateLabel,
}: {
  onEdit: () => void;
  disabled?: boolean;
  nextDateLabel?: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Current Password
          </p>

          <div className="mt-2 flex items-center gap-2">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-lg tracking-[0.45em] text-slate-700">
              ••••••••
            </div>
            <span className="text-xs text-slate-500">
              Hidden for security
            </span>
          </div>
        </div>

     <button
  type="button"
  onClick={onEdit}
  disabled={disabled}
  className={cn(
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[20px] px-4 text-sm font-semibold transition-all duration-200",
    disabled
      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
      : "bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] hover:-translate-y-[1px] hover:opacity-95",
  )}
>
  <Pencil className="h-4 w-4" />
  {disabled ? "Password Locked" : "Change Password"}
</button>
{disabled && nextDateLabel ? (
  <p className="mt-2 text-xs text-amber-700 sm:text-right">
    You can change password again on <span className="font-semibold">{nextDateLabel}</span>
  </p>
) : null}
      </div>
    </div>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] bg-slate-950/35 backdrop-blur-[3px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.985 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 top-1/2 w-[calc(100vw-24px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#fcf8ff_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.20)] sm:p-6"
          >
            <div className="absolute left-0 top-0 h-28 w-28 rounded-full bg-fuchsia-100/40 blur-3xl" />
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-violet-100/40 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                    STAR ENGINEERING
                  </p>
                  <h3 className="mt-2 text-[1.35rem] font-bold tracking-tight text-slate-900">
                    {title}
                  </h3>
                  {subtitle ? (
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
function getPasswordLockInfo(lastPasswordChangedAt?: string | null) {
  if (!lastPasswordChangedAt) {
    return {
      isLocked: false,
      nextDateLabel: "",
    };
  }

  const lastChangedAt = new Date(lastPasswordChangedAt);
  if (Number.isNaN(lastChangedAt.getTime())) {
    return {
      isLocked: false,
      nextDateLabel: "",
    };
  }

  const nextAllowedDate = new Date(lastChangedAt);
  nextAllowedDate.setDate(nextAllowedDate.getDate() + 30);

  const now = new Date();
  const isLocked = now < nextAllowedDate;

  return {
    isLocked,
    nextDateLabel: nextAllowedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}
export default function UserProfilePageClient() {
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [address, setAddress] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);

  const [modalStep, setModalStep] = useState<ModalStep>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPasswordCheck, setCurrentPasswordCheck] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    void fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setPageError("");

      const res = await apiFetch("/users/me");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPageError(json?.message || "Failed to load profile.");
        setData(null);
        return;
      }

      setData(json);
      setAddress(json.address || "");
    } catch {
      setPageError("Failed to load profile.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function openAddressEditConfirm() {
    setModalStep("address-enable-confirm");
  }

  function confirmAddressEdit() {
    setEditMode(true);
    setModalStep(null);
  }

  function openAddressSaveConfirm() {
    setModalStep("address-save-confirm");
  }

  async function handleSaveAddress() {
    try {
      setAddressSaving(true);

      const res = await apiFetch("/users/me/address", {
        method: "PATCH",
        body: JSON.stringify({ address }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSuccessMessage(json?.message || "Failed to update address.");
        setModalStep("success");
        return;
      }

      setEditMode(false);
      setSuccessMessage("Address updated successfully.");
      setModalStep("success");
      await fetchProfile();
    } catch {
      setSuccessMessage("Failed to update address.");
      setModalStep("success");
    } finally {
      setAddressSaving(false);
    }
  }

  function openPasswordEnableConfirm() {
  if (passwordLockInfo.isLocked) {
    setSuccessMessage(
      `Password change is blocked for now. You can change it again on ${passwordLockInfo.nextDateLabel}.`,
    );
    setModalStep("success");
    return;
  }

  setModalStep("password-enable-confirm");
}
 function goToCurrentPasswordCheck() {
  setPasswordError("");
  setCurrentPasswordCheck("");
  setModalStep("password-current");
}

async function continueToNewPassword() {
  if (!currentPasswordCheck.trim()) {
    setPasswordError("Please enter your current password.");
    return;
  }

  try {
    setPasswordSaving(true);
    setPasswordError("");

    const res = await apiFetch("/users/me/verify-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: currentPasswordCheck,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPasswordError(json?.message || "Current password is incorrect.");
      return;
    }

    setCurrentPassword(currentPasswordCheck);
    setModalStep("password-new");
  } catch {
    setPasswordError("Failed to verify current password.");
  } finally {
    setPasswordSaving(false);
  }
}

function openPasswordSaveConfirm() {
  if (!newPassword.trim() || !confirmPassword.trim()) {
    setPasswordError("Please fill new password and confirm password.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordError("New password and confirm password do not match.");
    return;
  }

  setPasswordError("");
  setModalStep("password-save-confirm");
}

async function handlePasswordSave() {
  try {
    setPasswordSaving(true);
    setPasswordError("");

    const res = await apiFetch("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (
        json?.message === "Current password is incorrect." ||
        json?.message === "Current password is incorrect"
      ) {
        setModalStep("password-current");
        setPasswordError("Current password is incorrect.");
        setCurrentPassword("");
        setCurrentPasswordCheck("");
        return;
      }

      setModalStep("password-new");
      setPasswordError(json?.message || "Failed to update password.");
      return;
    }

setCurrentPassword("");
setCurrentPasswordCheck("");
setNewPassword("");
setConfirmPassword("");
await fetchProfile();
setSuccessMessage("Password updated successfully. An email has been sent.");
setModalStep("success");
  } catch {
    setModalStep("password-new");
    setPasswordError("Failed to update password.");
  } finally {
    setPasswordSaving(false);
  }
}

function closeAllPasswordFlow() {
  setPasswordError("");
  setCurrentPassword("");
  setCurrentPasswordCheck("");
  setNewPassword("");
  setConfirmPassword("");
  setModalStep(null);
}

  if (loading) {
    return (
      <GlobalPageLoader
        title="Loading profile..."
        subtitle="Preparing your account details, address and password security settings."
      />
    );
  }

  if (pageError) {
    return (
      <div className="rounded-[26px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] p-6 shadow-[0_18px_45px_rgba(244,63,94,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-600">
          Profile Error
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Unable to load profile
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{pageError}</p>
      </div>
    );
  }
const passwordLockInfo = getPasswordLockInfo(data?.lastPasswordChangedAt);
  if (!data) return null;

  return (
    <>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)]">
          <div className="absolute left-0 top-0 h-36 w-36 rounded-full bg-fuchsia-100/30 blur-3xl" />
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-100/30 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="relative"
          >
            <h1 className="text-[2rem] font-bold tracking-tight text-slate-900 sm:text-[2.6rem] sm:leading-[1.06]">
              My Profile
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
              Manage your account details, registered address and password security.
            </p>
          </motion.div>
        </section>

        <Panel
          title="Account Details"
          subtitle="Registered details linked with your account"
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <Field label="Name" value={data.name || "-"} />
            <Field label="Email" value={data.email || "-"} />
            <Field label="Phone" value={data.phone || "-"} />
            <Field label="GSTIN" value={data.gstin || "-"} />
            <Field label="PAN" value={data.pan || "-"} />

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-500">Address</label>

              {editMode ? (
                <textarea
                  className="mt-1.5 min-h-[110px] w-full rounded-[18px] border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              ) : (
                <div className="mt-1.5 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
                  {data.address || "-"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!editMode ? (
              <button
                type="button"
                onClick={openAddressEditConfirm}
                className="inline-flex h-11 items-center justify-center rounded-[20px] bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] transition-all duration-200 hover:-translate-y-[1px] hover:opacity-95"
              >
                Edit Address
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openAddressSaveConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-[20px] bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(16,185,129,0.20)] transition-all duration-200 hover:-translate-y-[1px] hover:opacity-95"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setAddress(data.address || "");
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-[20px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </Panel>

        <Panel
          title="Security"
          subtitle="Change your password securely through guided verification"
          icon={<Lock className="h-5 w-5" />}
        >
          <PasswordDisplayBlock
  onEdit={openPasswordEnableConfirm}
  disabled={passwordLockInfo.isLocked}
  nextDateLabel={passwordLockInfo.nextDateLabel}
/>

         <div className="mt-4 rounded-[20px] border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
  {passwordLockInfo.isLocked
    ? `Password change is temporarily blocked. You can change it again on ${passwordLockInfo.nextDateLabel}.`
    : "Password can be changed once every 30 days."}
</div>
        </Panel>
      </div>

      <ModalShell
        open={modalStep === "address-enable-confirm"}
        title="Enable Address Editing"
        subtitle="Address changes will also reflect in the linked admin record."
        onClose={() => setModalStep(null)}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want to enable address editing for this account?
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalStep(null)}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAddressEdit}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] bg-violet-600 text-sm font-semibold text-white"
            >
              Continue
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={modalStep === "address-save-confirm"}
        title="Confirm Address Update"
        subtitle="Please verify before saving your changes."
        onClose={() => setModalStep(null)}
      >
        <div className="space-y-4">
          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {address || "-"}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalStep(null)}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAddress}
              disabled={addressSaving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[20px] bg-emerald-600 text-sm font-semibold text-white disabled:opacity-70"
            >
              {addressSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Address
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={modalStep === "password-enable-confirm"}
        title="Change Password"
        subtitle="Password update requires current password verification first."
        onClose={closeAllPasswordFlow}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want to start the password change process?
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeAllPasswordFlow}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={goToCurrentPasswordCheck}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] bg-violet-600 text-sm font-semibold text-white"
            >
              Continue
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={modalStep === "password-current"}
        title="Verify Current Password"
        subtitle="Enter your current password to continue."
        onClose={closeAllPasswordFlow}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500">
              Current Password
            </label>
            <input
              type="password"
              className="mt-1.5 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              value={currentPasswordCheck}
              onChange={(e) => setCurrentPasswordCheck(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          {passwordError ? (
            <p className="text-sm text-rose-600">{passwordError}</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeAllPasswordFlow}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
           <button
  type="button"
  onClick={continueToNewPassword}
  disabled={passwordSaving}
  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[20px] bg-violet-600 text-sm font-semibold text-white disabled:opacity-70"
>
  {passwordSaving ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <KeyRound className="h-4 w-4" />
  )}
  Verify & Continue
</button>
          </div>
        </div>
      </ModalShell>
<ModalShell
  open={modalStep === "password-new"}
  title="Set New Password"
  subtitle="Enter and confirm your new password."
  onClose={closeAllPasswordFlow}
>
  <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-slate-500">
          New Password
        </label>
        <input
          type="password"
          className="mt-1.5 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">
          Confirm Password
        </label>
        <input
          type="password"
          className="mt-1.5 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
        />
      </div>
    </div>

    {passwordError ? (
      <p className="text-sm text-rose-600">{passwordError}</p>
    ) : null}

    <div className="flex gap-2">
      <button
        type="button"
        onClick={closeAllPasswordFlow}
        className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={openPasswordSaveConfirm}
        className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] bg-rose-600 text-sm font-semibold text-white"
      >
        Continue
      </button>
    </div>
  </div>
</ModalShell>
      <ModalShell
        open={modalStep === "password-save-confirm"}
        title="Confirm Password Update"
        subtitle="Please confirm before saving your new password."
        onClose={() => setModalStep("password-new")}
      >
        <div className="space-y-4">
          <div className="rounded-[18px] border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
            After saving, your password will be updated and an email notification will be sent.
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalStep("password-new")}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePasswordSave}
              disabled={passwordSaving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[20px] bg-rose-600 text-sm font-semibold text-white disabled:opacity-70"
            >
              {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Password
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={modalStep === "success"}
        title="Update Status"
        subtitle="Profile action result"
        onClose={() => setModalStep(null)}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm leading-6 text-slate-700">{successMessage}</p>
          </div>

          <button
            type="button"
            onClick={() => setModalStep(null)}
            className="inline-flex h-11 w-full items-center justify-center rounded-[20px] bg-violet-600 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      </ModalShell>
    </>
  );
}