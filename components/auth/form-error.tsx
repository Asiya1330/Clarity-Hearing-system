/**
 * Accessible inline error for auth forms. role="alert" so the message is
 * announced; destructive token + adequate size for an older audience.
 */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive"
    >
      {message}
    </p>
  );
}
