import type { Question } from "@/engine/types";
import type { Submission } from "@/db/schema";
import { commonProps, optionLabel, P, type NotionProps } from "./common";

export function mapCommunity(s: Submission, questions: Question[], adminUrl: string | null): NotionProps {
  const a = s.answersJson;
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : null);
  return {
    "稱呼": P.title(str("C01") || s.displayName || "（未提供）"),
    "行業": P.select(optionLabel(questions, "C02", a.C02)),
    "階段": P.select(optionLabel(questions, "C03", a.C03)),
    "最想突破": P.select(optionLabel(questions, "C04", a.C04)),
    "90 日改變": P.text(str("C05")),
    "內容意向": P.select(optionLabel(questions, "C06", a.C06)),
    "推廣同意": P.checkbox(s.consentMarketing),
    ...commonProps(s, adminUrl),
  };
}
