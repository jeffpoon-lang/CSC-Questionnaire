import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { loadSettings, settingString } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const db = await getDb();
  const st = await loadSettings(db, ["privacy_url"]);
  const url = settingString(st, "privacy_url");
  if (url) redirect(url);
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16 sm:px-8">
      <h1 className="text-2xl font-semibold text-stone-900">私隱聲明</h1>
      <p className="mt-4 text-stone-600">最終私隱聲明由 Carey／Jojo 提供並批准後，會在此顯示。在此之前，我們只會將你提交的資料用於課程、社群及申請跟進，並不會向第三方出售或分享。</p>
      <p className="mt-4 text-sm text-stone-500">（Admin 可在「設定」加入正式私隱聲明連結。）</p>
    </main>
  );
}
