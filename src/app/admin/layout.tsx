import { requireAdmin } from "@/server/auth/require-admin";
import { NavLink } from "@/components/admin/ui";
import { logoutAction } from "@/app/(auth)/admin/login/actions";
import { getEnv } from "@/db/client";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const env = await getEnv();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
          <span className="mr-2 text-sm font-semibold">CSC Admin</span>
          {env.APP_ENV !== "production" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{env.APP_ENV.toUpperCase()}</span>}
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink href="/admin">總覽</NavLink>
            <NavLink href="/admin/submissions">提交</NavLink>
            <NavLink href="/admin/forms">表單</NavLink>
            <NavLink href="/admin/modules">模組</NavLink>
            <NavLink href="/admin/invites">邀請連結</NavLink>
            <NavLink href="/admin/notion">Notion</NavLink>
            <NavLink href="/admin/settings">設定</NavLink>
            <NavLink href="/admin/preflight">上線檢查</NavLink>
          </nav>
          <form action={logoutAction} className="ml-auto flex items-center gap-3 text-sm text-stone-600">
            <span>{user.displayName}（{user.role}）</span>
            <button type="submit" className="underline">登出</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
