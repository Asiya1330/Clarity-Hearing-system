"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth/form-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "loading" | "challenge" | "enroll" | "error";

/**
 * Standard TOTP MFA — works with Google Authenticator and any compatible app.
 * If the account already has a verified TOTP factor we challenge it; otherwise
 * we enrol a fresh factor (cleaning up any stale unverified ones first) and
 * show the QR + secret. A successful verify upgrades the session to AAL2 and
 * we proceed to the console.
 */
export function ControlRoomMfa({
  consolePath,
  loginPath,
}: {
  consolePath: string;
  loginPath: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  console.log("consolePath", consolePath);

  const init = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    try {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      console.log("aal", aal);
      if (aalError) {
        setMode("error");
        console.log("aalError", aalError);
        setError("Could not start verification. Try again.");
        return;
      }
      if (aal?.currentLevel === "aal2") {
        router.replace(consolePath);
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setMode("error");
        setError("Could not start verification. Try again.");
        return;
      }

      const verified = factors?.totp ?? [];
      if (verified.length > 0) {
        setFactorId(verified[0].id);
        setMode("challenge");
        return;
      }

      // No verified factor — clear stale unverified ones, then enrol fresh.
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "OViz Owner Console",
      });
      if (enrollError || !enrolled) {
        setMode("error");
        setError("Could not start enrollment. Try again.");
        return;
      }
      setFactorId(enrolled.id);
      setQrCode(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setMode("enroll");
    } catch {
      setMode("error");
      setError("Could not start verification. Try again.");
    }
  }, [consolePath, router]);

  useEffect(() => {
    void init();
  }, [init]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (verifyError) {
        setError("That code was not accepted. Try again.");
        setSubmitting(false);
        return;
      }
      router.replace(consolePath);
    } catch {
      setError("That code was not accepted. Try again.");
      setSubmitting(false);
    }
  };

  const signOutAndRestart = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(loginPath);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor verification</CardTitle>
        <CardDescription>
          {mode === "enroll"
            ? "Scan the code with Google Authenticator (or any authenticator app), then enter the 6-digit code."
            : "Enter the 6-digit code from your authenticator app."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === "loading" && (
          <p className="text-base text-brand-muted">Preparing secure verification…</p>
        )}

        {mode === "error" && (
          <div className="flex flex-col gap-4">
            {error && <FormError message={error} />}
            <Button variant="outline" onClick={() => void init()}>
              Try again
            </Button>
          </div>
        )}

        {(mode === "enroll" || mode === "challenge") && (
          <form onSubmit={verify} data-testid="control-room-mfa-form">
            <div className="flex flex-col gap-6">
              {mode === "enroll" && qrCode && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-brand-line bg-brand-mist/40 p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="TOTP QR code"
                    width={180}
                    height={180}
                    className="h-44 w-44"
                  />
                  {secret && (
                    <div className="text-center">
                      <p className="text-sm text-brand-muted">
                        Or enter this key manually:
                      </p>
                      <code className="mt-1 block break-all font-mono text-sm text-brand-navy">
                        {secret}
                      </code>
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="mfa-code" className="text-base text-brand-navy">
                  6-digit code
                </Label>
                <Input
                  id="mfa-code"
                  data-testid="control-room-mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={8}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              {error && (
                <div data-testid="control-room-mfa-error">
                  <FormError message={error} />
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting || code.length < 6}
                data-testid="control-room-mfa-verify"
              >
                {submitting ? "Verifying…" : "Verify and continue"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => void signOutAndRestart()}
            className="text-sm font-medium text-brand-teal-700 underline-offset-4 hover:underline"
          >
            Use a different account
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
