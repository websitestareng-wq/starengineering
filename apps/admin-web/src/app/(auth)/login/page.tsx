"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  FileText,
  Handshake,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import CaptchaField from "@/components/ui/CaptchaField";
import { identifyPortalUser, loginAdmin, loginUser } from "@/lib/auth";
import { ADMIN_ROUTES, USER_ROUTES } from "@/lib/routes";
import type { PortalRole } from "@/lib/types";

type PrimaryFormState = {
  emailOrPhone: string;
  password: string;
};

type VerificationFormState = {
  captchaToken: string;
  secretKey: string;
};

const initialPrimaryForm: PrimaryFormState = {
  emailOrPhone: "",
  password: "",
};

const initialVerificationForm: VerificationFormState = {
  captchaToken: "",
  secretKey: "",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"primary" | "verification">("primary");
  const [detectedRole, setDetectedRole] = useState<PortalRole | null>(null);
  const [requiresSecretKey, setRequiresSecretKey] = useState(false);

  const [primaryForm, setPrimaryForm] = useState(initialPrimaryForm);
  const [verificationForm, setVerificationForm] = useState(initialVerificationForm);

  const [showPassword, setShowPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nextPath = useMemo(() => {
    const requested = searchParams.get("next")?.trim();

    if (!requested) return null;
    if (!requested.startsWith("/")) return null;
    if (requested.startsWith("//")) return null;

    return requested;
  }, [searchParams]);

  const isAdminVerification = useMemo(() => {
    return (
      requiresSecretKey ||
      detectedRole === "SUPER_ADMIN" ||
      detectedRole === "ADMIN_VIEWER"
    );
  }, [requiresSecretKey, detectedRole]);

  const isPrimaryDisabled = useMemo(() => {
    return (
      !primaryForm.emailOrPhone.trim() ||
      !primaryForm.password.trim() ||
      isSubmitting
    );
  }, [primaryForm, isSubmitting]);

  const isVerificationDisabled = useMemo(() => {
    if (!verificationForm.captchaToken.trim() || isSubmitting) {
      return true;
    }

    if (isAdminVerification && !verificationForm.secretKey.trim()) {
      return true;
    }

    return false;
  }, [verificationForm, isSubmitting, isAdminVerification]);

  useEffect(() => {
    window.history.replaceState(null, "", window.location.href);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function resetError() {
    setErrorMessage("");
  }
async function saveBrowserCredentials() {
  try {
    if (typeof window === "undefined") return;

    const nav = navigator as Navigator & {
      credentials?: {
        store?: (credential: unknown) => Promise<unknown>;
      };
    };

    const Win = window as typeof window & {
      PasswordCredential?: new (data: {
        id: string;
        password: string;
        name?: string;
      }) => unknown;
    };

    if (!nav.credentials?.store || !Win.PasswordCredential) return;

    const credential = new Win.PasswordCredential({
      id: primaryForm.emailOrPhone.trim(),
      password: primaryForm.password,
      name: primaryForm.emailOrPhone.trim(),
    });

    await nav.credentials.store(credential);
  } catch {
    // silently ignore - browser may not support it
  }
}
function persistSessionUser(user: unknown) {
  if (typeof window === "undefined" || !user) return;

  try {
    const safeUser =
      typeof user === "object" && user !== null ? user : null;

    if (!safeUser) return;

    window.localStorage.setItem("currentUser", JSON.stringify(safeUser));
    window.localStorage.setItem("auth_user", JSON.stringify(safeUser));
    window.localStorage.setItem("user", JSON.stringify(safeUser));
  } catch {
    // ignore storage errors
  }
}
  async function handlePrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetError();

    try {
      setIsSubmitting(true);

      const identify = await identifyPortalUser({
        emailOrPhone: primaryForm.emailOrPhone.trim(),
        password: primaryForm.password,
      });

      setDetectedRole(identify.role);
      setRequiresSecretKey(Boolean(identify.requiresSecretKey));
      setVerificationForm(initialVerificationForm);
      await new Promise((r) => setTimeout(r, 150));
      setStep("verification");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetError();

    try {
      setIsSubmitting(true);

      if (isAdminVerification) {
        const result = await loginAdmin({
          emailOrPhone: primaryForm.emailOrPhone.trim(),
          password: primaryForm.password,
          secretKey: verificationForm.secretKey,
          captchaToken: verificationForm.captchaToken,
        });

        // ❌ DO NOTHING - backend cookie already set

    if (
  result?.user?.role !== "SUPER_ADMIN" &&
  result?.user?.role !== "ADMIN_VIEWER"
) {
  throw new Error("Unable to validate admin role.");
}

persistSessionUser(result.user);
await saveBrowserCredentials();

const adminRedirectPath =
  nextPath && nextPath.startsWith("/admin")
    ? nextPath
    : ADMIN_ROUTES.DASHBOARD;

router.replace(adminRedirectPath);
router.refresh();
return;
      }

      const result = await loginUser({
        emailOrPhone: primaryForm.emailOrPhone.trim(),
        password: primaryForm.password,
        captchaToken: verificationForm.captchaToken,
      });

      // ❌ DO NOTHING - backend cookie already set

if (!result?.user?.role) {
  throw new Error("Unable to validate user role.");
}

persistSessionUser(result.user);
await saveBrowserCredentials();

const userRedirectPath =
  nextPath && !nextPath.startsWith("/admin")
    ? nextPath
    : USER_ROUTES.DASHBOARD;

router.replace(userRedirectPath);
router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    setStep("primary");
    setDetectedRole(null);
    setRequiresSecretKey(false);
    setVerificationForm(initialVerificationForm);
    setShowSecretKey(false);
    setErrorMessage("");
  }

  return (
    <main className="auth-page">
      <div className="auth-bg-base" />
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />
      <div className="auth-bg-orb auth-bg-orb-3" />

      <div className="auth-shell">
        <div className="auth-topbar">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="auth-back-to-site"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </button>
        </div>

        <header className="auth-header">
          <div className="auth-brand">
            <div className="auth-logo">
              <Image
                src="/logo/star-logo.png"
                alt="STAR ENGINEERING"
                width={44}
                height={44}
                className="auth-logo-image"
                priority
              />
            </div>

            <div>
              <div className="auth-brand-title">STAR ENGINEERING</div>
              <div className="auth-brand-subtitle">
                Business access portal for customers, partners, and authorized users
              </div>
            </div>
          </div>
        </header>

        <section className="auth-layout">
          <div className="auth-hero">
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  className="auth-hero-badge"
>
  <BadgeCheck className="h-4 w-4" />
  Trusted business access portal
</motion.div>

          <motion.h1
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, delay: 0.03 }}
  className="auth-hero-title"
>
  Secure Access to <span className="auth-hero-accent">Business Records</span>,
  Shared Documents, and Account Information.
</motion.h1>

            <motion.p
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.48, delay: 0.06 }}
  className="auth-hero-text"
>
  This portal is designed to provide secure and structured access to
  transaction records, shared documents, account-related information,
  and important business updates from STAR ENGINEERING.
</motion.p>

            <motion.p
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.09 }}
  className="auth-hero-text auth-hero-text-secondary"
>
  Access is protected through secure authentication and verification,
  ensuring confidentiality, business continuity, and controlled visibility
  of shared information.
</motion.p>

          <div className="auth-trust-row">
  <TrustPill
    icon={<ShieldCheck className="h-4 w-4" />}
    text="Secure authentication"
  />
  <TrustPill
    icon={<Handshake className="h-4 w-4" />}
    text="Business records"
  />
  <TrustPill
    icon={<Users className="h-4 w-4" />}
    text="Controlled access"
  />
</div>
<div className="auth-info-grid">
  <InfoCard
    icon={<Building2 className="h-5 w-5" />}
    title="Business overview"
    text="View essential account information and shared business details through a clean and structured portal."
  />
  <InfoCard
    icon={<FileText className="h-5 w-5" />}
    title="Documents & records"
    text="Access invoices, statements, transaction documents, and related records provided through your account."
  />
  <InfoCard
    icon={<Users className="h-5 w-5" />}
    title="Organized experience"
    text="Designed to provide a professional and streamlined experience for viewing updates and shared information."
  />
  <InfoCard
    icon={<ShieldCheck className="h-5 w-5" />}
    title="Protected environment"
    text="Secure verification and controlled permissions help maintain privacy and reliability across the portal."
  />
</div>

  <div className="auth-stats">
  <StatCard value="Records" label="Business access" />
  <StatCard value="Secure" label="Verification" />
  <StatCard value="Shared" label="Information flow" />
  <StatCard value="Managed" label="Portal experience" />
</div>
          </div>

          <div className="auth-card-wrap">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="auth-card"
            >
              <div className="auth-card-topline" />

              <div className="auth-card-head">
                <div className="auth-card-head-icon">
                  {step === "primary" ? (
                    <LockKeyhole className="h-5 w-5" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}
                </div>

                <div>
<div className="auth-card-eyebrow">
  {step === "primary" ? "Secure portal login" : "Protected verification"}
</div>
<h2 className="auth-card-title">
  {step === "primary" ? "Access your records" : "Complete verification"}
</h2>
<p className="auth-card-subtitle">
  {step === "primary"
    ? "Sign in with your registered details to continue."
    : isAdminVerification
      ? "Complete captcha and secret key verification to continue."
      : "Complete captcha verification to continue."}
</p>
                </div>
              </div>

              <div className="auth-stepper">
                <div className={`auth-step-item ${step === "primary" ? "active" : "done"}`}>
                  <span>1</span>
                  <p>Credentials</p>
                </div>
                <div
                  className={`auth-step-line ${step === "verification" ? "active" : ""}`}
                />
                <div
                  className={`auth-step-item ${step === "verification" ? "active" : ""}`}
                >
                  <span>2</span>
                  <p>Verification</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {step === "primary" ? (
                  <motion.form
                    key="primary"
                    autoComplete="on"
                    onSubmit={handlePrimarySubmit}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="auth-form"
                  >
                    <FieldShell
                      icon={<UserRound className="h-4 w-4" />}
                      label="Email or phone"
                    >
                      <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        value={primaryForm.emailOrPhone}
                        onChange={(e) => {
                          setPrimaryForm((prev) => ({
                            ...prev,
                            emailOrPhone: e.target.value,
                          }));
                          if (errorMessage) setErrorMessage("");
                        }}
                        placeholder="Enter your email or phone"
                        className="auth-input-element"
                      />
                    </FieldShell>

                    <FieldShell
                      icon={<LockKeyhole className="h-4 w-4" />}
                      label="Password"
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="auth-icon-button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    >
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        value={primaryForm.password}
                        onChange={(e) => {
                          setPrimaryForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }));
                          if (errorMessage) setErrorMessage("");
                        }}
                        placeholder="Enter your password"
                        className="auth-input-element"
                      />
                    </FieldShell>

                    {errorMessage ? (
                      <div className="auth-alert auth-alert-inline">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    ) : null}

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={isPrimaryDisabled}
                      type="submit"
                      className="auth-button"
                    >
                      <span className="auth-button-shine" />
                      <span className="relative z-10 inline-flex items-center gap-2">
                        {isSubmitting ? "Verifying..." : "Continue"}
                        {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                      </span>
                    </motion.button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="verification"
                    onSubmit={handleVerificationSubmit}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="auth-form"
                  >
                    <button
                      type="button"
                      onClick={handleBack}
                      className="auth-back-button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <div className="auth-captcha-panel">
                      <div className="auth-captcha-label">
                        <ShieldCheck className="h-4 w-4" />
                        Security verification
                      </div>

                      <CaptchaField
                        value={verificationForm.captchaToken}
                        onChange={(value) =>
                          setVerificationForm((prev) => ({
                            ...prev,
                            captchaToken: value,
                          }))
                        }
                      />
                    </div>

                    {isAdminVerification ? (
                      <FieldShell
                        icon={<KeyRound className="h-4 w-4" />}
                        label="Secret key"
                        rightSlot={
                          <button
                            type="button"
                            onClick={() => setShowSecretKey((prev) => !prev)}
                            className="auth-icon-button"
                            aria-label={
                              showSecretKey ? "Hide secret key" : "Show secret key"
                            }
                          >
                            {showSecretKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        }
                      >
                        <input
                          type={showSecretKey ? "text" : "password"}
                          value={verificationForm.secretKey}
                          onChange={(e) => {
                            setVerificationForm((prev) => ({
                              ...prev,
                              secretKey: e.target.value,
                            }));
                            if (errorMessage) setErrorMessage("");
                          }}
                          placeholder="Enter your secret key"
                          className="auth-input-element"
                        />
                      </FieldShell>
                    ) : null}

                    {errorMessage ? (
                      <div className="auth-alert auth-alert-inline">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    ) : null}

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={isVerificationDisabled}
                      type="submit"
                      className="auth-button"
                    >
                      <span className="auth-button-shine" />
                      <span className="relative z-10 inline-flex items-center gap-2">
                        {isSubmitting ? "Authorizing..." : "Login securely"}
                        {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                      </span>
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>

<div className="auth-footer">
  Access to this portal is restricted to approved and verified business
  accounts associated with STAR ENGINEERING.
</div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FieldShell({
  label,
  icon,
  children,
  rightSlot,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="auth-label">{label}</span>
      <div className="auth-input-shell">
        <span className="auth-input-icon">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </label>
  );
}

function TrustPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="auth-trust-pill">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="auth-info-card"
    >
      <div className="auth-info-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </motion.div>
  );
}

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="auth-stat-card">
      <div className="auth-stat-value">{value}</div>
      <div className="auth-stat-label">{label}</div>
    </div>
  );
}
