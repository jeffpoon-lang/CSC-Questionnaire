import Link from "next/link";
import type { ReactNode } from "react";

export const STATUS_LABELS: Record<string, string> = {
  new: "新提交",
  reviewing: "審閱中",
  contacted: "已聯絡",
  qualified: "合適",
  closed: "已結束",
  spam: "垃圾",
};
export const FORM_LABELS: Record<string, string> = {
  community: "Community",
  generic_csc: "Generic CSC",
  high_ticket: "High-ticket",
};
export const NOTION_LABELS: Record<string, string> = { pending: "待同步", synced: "已同步", failed: "失敗", skipped: "略過" };

const statusColor: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-amber-100 text-amber-800",
  contacted: "bg-violet-100 text-violet-800",
  qualified: "bg-emerald-100 text-emerald-800",
  closed: "bg-stone-200 text-stone-700",
  spam: "bg-red-100 text-red-800",
  synced: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-stone-200 text-stone-700",
  pending: "bg-amber-100 text-amber-800",
};

export function Badge({ value, labels }: { value: string; labels?: Record<string, string> }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor[value] ?? "bg-stone-100 text-stone-700"}`}>{labels?.[value] ?? value}</span>;
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-stone-700">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const inputCls = "rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-900";
export const btnCls = "inline-flex items-center rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50";
export const btnSecondaryCls = "inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:border-stone-500";

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong", hour12: false });
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="rounded px-2 py-1 text-sm text-stone-700 hover:bg-stone-100">{children}</Link>;
}
