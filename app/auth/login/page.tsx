import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <AuthShell eyebrow="Welcome back">
      <LoginForm />
    </AuthShell>
  );
}
