"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/** Console logout — returns to the hidden console login, not the clinic app
 *  login, so the surface is never advertised. */
export function ConsoleLogoutButton({ loginPath }: { loginPath: string }) {
  const router = useRouter();
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(loginPath);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={logout}
      className="border-brand-white/20 bg-transparent text-brand-white/90 hover:bg-brand-white/10 hover:text-brand-white"
    >
      Log out
    </Button>
  );
}
