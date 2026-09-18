"use client";

export function StepProgress(props: {
  /** Section name, or a state label on the intro / review steps. */
  label: string;
  /** e.g. "第 3 ／ 12 頁". */
  caption: string;
  percent: number;
  sections: string[];
  /** -1 before the first section, sections.length once past the last. */
  activeSection: number;
  /** Warns that this submission will be stored as test data. */
  testMode?: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
      {props.testMode && (
        <p role="status" className="bg-amber-200 px-5 py-1.5 text-center text-xs font-semibold text-amber-900 sm:px-8">
          測試模式：此提交會標記為測試資料，不會當作真實查詢
        </p>
      )}
      <div className="mx-auto w-full max-w-2xl px-5 pb-2.5 pt-3 sm:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-stone-900">{props.label}</span>
          <span className="text-xs tabular-nums text-stone-500" aria-live="polite">
            {props.caption}
          </span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${props.percent}%` }}
          />
        </div>
        {props.sections.length > 1 && (
          <ol className="mt-2 flex gap-1">
            {props.sections.map((s, i) => {
              const done = i < props.activeSection;
              const now = i === props.activeSection;
              return (
                <li
                  key={s}
                  aria-current={now ? "step" : undefined}
                  className={`flex-1 truncate border-t-2 pt-1.5 text-center text-[10px] tracking-wide transition-colors ${
                    done || now ? "border-[var(--accent)]" : "border-stone-200"
                  } ${now ? "font-semibold text-stone-900" : done ? "text-stone-500" : "text-stone-400"}`}
                >
                  <span className="max-sm:hidden">{s}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
