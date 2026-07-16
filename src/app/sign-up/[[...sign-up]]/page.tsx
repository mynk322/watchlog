import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-73px)] items-center justify-center overflow-hidden px-4 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--accent)_25%,transparent),transparent_55%),radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--gold)_18%,transparent),transparent_50%)]" />
      <div className="relative z-10">
        <SignUp />
      </div>
    </div>
  );
}
