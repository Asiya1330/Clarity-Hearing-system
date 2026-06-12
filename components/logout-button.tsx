"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      variant="outline"
      onClick={logout}
      className="h-11 border-brand-line px-5 text-base font-medium text-brand-navy hover:border-brand-teal hover:text-brand-teal-700"
    >
      Log out
    </Button>
  );
}
