import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <AuthShell eyebrow="Choose a new password">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
