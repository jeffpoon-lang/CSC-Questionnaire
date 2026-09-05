import type { Question } from "@/engine/types";
import type { Submission } from "@/db/schema";
import { commonProps, optionLabel, optionLabels, P, type NotionProps } from "./common";

/** Spec §6: the minimum synced field list for Page 1. */
export function mapGenericCsc(s: Submission, questions: Question[], adminUrl: string | null): NotionProps {
  const a = s.answersJson;
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : null);
  return {
    "姓名": P.title(str("G01") || s.displayName || "（未提供）"),
    "WhatsApp": P.phone(s.phoneE164 ?? str("G02")),
    "電郵": P.email(s.email ?? str("G03")),
    "行業": P.select(optionLabel(questions, "G05", a.G05)),
    "創業階段": P.select(optionLabel(questions, "G06", a.G06)),
    "團隊規模": P.select(optionLabel(questions, "G07", a.G07)),
    "三個痛點": P.multi(optionLabels(questions, "G08", a.G08)),
    "首要問題": P.select(optionLabel(questions, "G09", a.G09)),
    "90 日目標": P.text(str("G11")),
    "意向支援": P.select(optionLabel(questions, "G17", a.G17)),
    "認識渠道": P.select(optionLabel(questions, "G18", a.G18)),
    ...commonProps(s, adminUrl),
  };
}
