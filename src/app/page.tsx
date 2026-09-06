import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">CSC 問卷平台</h1>
      <ul className="mt-6 space-y-2 text-sm">
        <li><Link className="underline" href="/f/community">加入 Carey 創業資訊群前的 1 分鐘了解</Link></li>
        <li><Link className="underline" href="/f/generic_csc">了解你的創業現況</Link></li>
        <li><Link className="underline" href="/f/high_ticket">創辦人增長與團隊診斷申請</Link></li>
        <li><Link className="underline" href="/admin">Admin</Link></li>
      </ul>
    </main>
  );
}
