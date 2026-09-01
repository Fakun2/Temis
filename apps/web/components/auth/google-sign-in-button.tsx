"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoogleCredentialResponse } from "@/lib/auth/google-auth";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (input: {
            callback: (response: GoogleCredentialResponse) => void;
            client_id: string;
            use_fedcm_for_button?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              logo_alignment?: "left" | "center";
              shape?: "rectangular" | "pill" | "circle" | "square";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              theme?: "outline" | "filled_blue" | "filled_black";
              type?: "standard" | "icon";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  disabled?: boolean;
  mode: "login" | "signup";
  onCredential: (credential: string) => void;
  onMissingClientId?: () => void;
};

const googleScriptId = "google-identity-services-script";
let initializedGoogleClientId: string | null = null;
let activeCredentialHandler: ((credential: string) => void) | null = null;

export function GoogleSignInButton({
  disabled,
  mode,
  onCredential,
  onMissingClientId
}: GoogleSignInButtonProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(390);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const label = mode === "signup" ? "Crear cuenta con Google" : "Iniciar sesion con Google";

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const existingScript = document.getElementById(googleScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.accounts?.id) {
        setScriptReady(true);
      } else {
        existingScript.addEventListener("load", () => setScriptReady(true), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.id = googleScriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    const googleId = window.google?.accounts?.id;
    if (!clientId || !scriptReady || !googleId) {
      return;
    }

    activeCredentialHandler = onCredential;
    if (initializedGoogleClientId !== clientId) {
      googleId.initialize({
        callback: (response) => {
          if (response.credential) {
            activeCredentialHandler?.(response.credential);
          }
        },
        client_id: clientId,
        use_fedcm_for_button: false
      });
      initializedGoogleClientId = clientId;
    }
  }, [clientId, onCredential, scriptReady]);

  useEffect(() => {
    const container = buttonContainerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.floor(container.getBoundingClientRect().width);
      setButtonWidth(Math.max(200, Math.min(400, nextWidth || 390)));
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [clientId, scriptReady]);

  useEffect(() => {
    const googleId = window.google?.accounts?.id;
    const container = buttonContainerRef.current;
    if (!clientId || !scriptReady || !googleId || !container) {
      return;
    }

    activeCredentialHandler = onCredential;
    container.innerHTML = "";
    googleId.renderButton(container, {
      logo_alignment: "left",
      shape: "pill",
      size: "large",
      text: mode === "signup" ? "signup_with" : "signin_with",
      theme: "outline",
      type: "standard",
      width: buttonWidth
    });
  }, [buttonWidth, clientId, mode, onCredential, scriptReady]);

  if (clientId && scriptReady) {
    return (
      <div
        ref={buttonContainerRef}
        className={disabled ? "w-full pointer-events-none opacity-60" : "w-full"}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full rounded-2xl border-field-border bg-background text-sm text-foreground shadow-sm transition-colors hover:border-[#4285f4]/45 hover:bg-[#f8fbff] hover:text-[#111827]"
      disabled={disabled || Boolean(clientId && !scriptReady)}
      onClick={() => {
        if (!clientId) {
          onMissingClientId?.();
        }
      }}
    >
      {disabled || (clientId && !scriptReady) ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleLogo />
      )}
      {label}
    </Button>
  );
}

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 10.041H21V10H12v4h5.651C16.827 16.328 14.611 18 12 18c-3.314 0-6-2.686-6-6s2.686-6 6-6c1.529 0 2.921.577 3.98 1.52l2.828-2.828C17.023 3.026 14.634 2 12 2 6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10c0-.67-.069-1.325-.195-1.959z"
        fill="#FFC107"
      />
      <path
        d="M3.153 7.345l3.286 2.409C7.328 7.554 9.481 6 12 6c1.529 0 2.921.577 3.98 1.52l2.828-2.828C17.023 3.026 14.634 2 12 2 8.159 2 4.828 4.168 3.153 7.345z"
        fill="#FF3D00"
      />
      <path
        d="M12 22c2.583 0 4.93-.988 6.704-2.596l-3.094-2.619C14.572 17.575 13.303 18 12 18c-2.6 0-4.809-1.658-5.641-3.973l-3.262 2.514C4.752 19.778 8.113 22 12 22z"
        fill="#4CAF50"
      />
      <path
        d="M21.805 10.041H21V10H12v4h5.651a6.02 6.02 0 0 1-2.044 2.785l.002-.001 3.094 2.619C18.485 19.602 22 17 22 12c0-.67-.069-1.325-.195-1.959z"
        fill="#1976D2"
      />
    </svg>
  );
}
