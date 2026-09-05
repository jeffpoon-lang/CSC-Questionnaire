import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClosedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const msg =
    reason === "invite" ? "此邀請連結已失效或已達使用上限，請聯絡團隊索取新連結。"
    : reason === "invite_required" ? "此表單只限邀請填寫。"
    : "此表單目前未開放。";
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16 sm:px-8">
      <h1 className="text-2xl font-semibold text-stone-900">未能開啟表單</h1>
      <p className="mt-4 text-stone-600">{msg}</p>
      <Link href="/" className="mt-8 inline-block underline">返回首頁</Link>
    </main>
  );
}
