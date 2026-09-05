import { redirect } from "next/navigation";
import { currentAdmin } from "@/server/auth/require-admin";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentAdmin();
  if (user) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-xl font-semibold text-stone-900">CSC Admin 登入</h1>
      <LoginForm next={next ?? "/admin"} />
    </main>
  );
}
