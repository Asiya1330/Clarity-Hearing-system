"use client";

import { useState } from "react";
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

/**
 * Hidden console sign-in. Email + password only (no signup, no provider
 * buttons, no email-existence hints). On success we route to the MFA step,
 * which performs the SERVER-SIDE eligibility check and either advances to the
 * console or redirects away generically. No owner email or role logic lives in
 * this client bundle.
 */
export function ControlRoomLogin({ mfaPath }: { mfaPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // Generic — never reveal whether the email exists or has access.
        setError("Those credentials did not work.");
        setIsLoading(false);
        return;
      }
      // Server decides eligibility + MFA from here.
      router.replace(mfaPath);
    } catch {
      setError("Those credentials did not work.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Restricted access. Authorized accounts only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} data-testid="control-room-login-form">
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="cr-email" className="text-base text-brand-navy">
                Email
              </Label>
              <Input
                id="cr-email"
                data-testid="control-room-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cr-password" className="text-base text-brand-navy">
                Password
              </Label>
              <Input
                id="cr-password"
                data-testid="control-room-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div data-testid="control-room-login-error">
                <FormError message={error} />
              </div>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
              data-testid="control-room-login-button"
            >
              {isLoading ? "Verifying…" : "Continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
