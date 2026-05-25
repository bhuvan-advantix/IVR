import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Atithiseva IVR</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Admin sign in</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
