"use client";

import Script from "next/script";
import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

type CaptchaFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export default function CaptchaField({
  value,
  onChange,
  label = "Captcha verification",
}: CaptchaFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [hideWidget, setHideWidget] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!value) {
      setHideWidget(false);
      setAnimateOut(false);
      return;
    }

    const startAnimationTimer = window.setTimeout(() => {
      setAnimateOut(true);
    }, 1000);

    const hideTimer = window.setTimeout(() => {
      setHideWidget(true);
    }, 1350);

    return () => {
      window.clearTimeout(startAnimationTimer);
      window.clearTimeout(hideTimer);
    };
  }, [value]);

  useEffect(() => {
    if (!scriptLoaded) return;
    if (!containerRef.current) return;
    if (!window.turnstile) return;
    if (hideWidget) return;

    if (!siteKey) {
      setRenderError("Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY.");
      return;
    }

    if (widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        appearance: "always",
       callback: (token: string) => {
  console.log("CAPTCHA TOKEN:", token); // 👈 ADD THIS
  onChangeRef.current(token);
  setRenderError("");
},
        "expired-callback": () => {
          onChangeRef.current("");
          setHideWidget(false);
          setAnimateOut(false);
          setRenderError("Captcha expired. Please verify again.");

          if (widgetIdRef.current && window.turnstile?.reset) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
        "error-callback": () => {
          onChangeRef.current("");
          setHideWidget(false);
          setAnimateOut(false);
          setRenderError("Captcha could not be loaded. Please refresh and try again.");
        },
      });
    } catch {
      setRenderError("Captcha could not be initialized.");
    }

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, hideWidget]);

  return (
    <div className="w-full space-y-2 overflow-hidden">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">
              Human verification
            </div>
            <div className="text-xs text-slate-500">
              Complete captcha validation to continue securely.
            </div>
          </div>
        </div>

        {!hideWidget ? (
          <div
            className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-3 transition-all duration-300 ease-out ${
              animateOut
                ? "max-h-0 translate-y-[-6px] opacity-0 py-0"
                : "max-h-[140px] translate-y-0 opacity-100"
            }`}
          >
            <div
              ref={containerRef}
              className="min-h-[65px] w-full max-w-full overflow-hidden"
            />
          </div>
        ) : null}

        {value ? (
          <p className="mt-2 text-xs font-medium text-emerald-600">
            Captcha verified successfully.
          </p>
        ) : null}

        {renderError ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            {renderError}
          </p>
        ) : null}
      </div>
    </div>
  );
}