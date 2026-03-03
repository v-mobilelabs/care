"use client";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

/**
 * Wraps children with GoogleReCaptchaProvider (reCAPTCHA v3).
 * Mount this only on pages that need bot protection — login, signup, etc.
 * The reCAPTCHA badge is hidden via the global CSS rule in globals.css.
 */
export function CaptchaProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={SITE_KEY}
      scriptProps={{ async: true, defer: true }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
