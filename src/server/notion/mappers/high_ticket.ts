import type { Question } from "@/engine/types";
import type { Submission } from "@/db/schema";
import { commonProps, optionLabel, optionLabels, P, type NotionProps } from "./common";

/** Identity + tags + status only. Long answers stay in Admin. */
export function mapHighTicket(s: Submission, questions: Question[], adminUrl: string | null): NotionProps {
  const a = s.answersJson;
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : null);
  return {
    "姓名": P.title(str("Q01") || s.displayName || "（未提供）"),
    "公司": P.text(str("Q02")),
    "角色": P.select(optionLabel(questions, "Q03", a.Q03)),
    "語言": P.select(optionLabel(questions, "Q05", a.Q05)),
    "領域": P.select(optionLabel(questions, "Q06", a.Q06)),
    "營運年期": P.select(optionLabel(questions, "Q07", a.Q07)),
    "團隊規模": P.select(optionLabel(questions, "Q08", a.Q08)),
    "據點": P.select(optionLabel(questions, "Q09", a.Q09)),
    "階段": P.select(optionLabel(questions, "Q11", a.Q11)),
    "月營業額": P.select(optionLabel(questions, "Q12", a.Q12)),
    "三個問題": P.multi(optionLabels(questions, "Q13", a.Q13)),
    "救火時數": P.select(optionLabel(questions, "Q16", a.Q16)),
    "決策權": P.select(optionLabel(questions, "Q20", a.Q20)),
    "執行負責": P.select(optionLabel(questions, "Q21", a.Q21)),
    "可投入時間": P.select(optionLabel(questions, "Q22", a.Q22)),
    "準備度": P.number(typeof a.Q23 === "number" ? a.Q23 : null),
    "支援意向": P.select(optionLabel(questions, "Q24", a.Q24)),
    "投資範圍": P.select(optionLabel(questions, "Q25", a.Q25)),
    "期望": P.select(optionLabel(questions, "Q26", a.Q26)),
    "電郵": P.email(s.email ?? str("Q28")),
    "WhatsApp": P.phone(s.phoneE164 ?? str("Q29")),
    "連結": P.url(str("Q30")),
    "認識渠道": P.select(optionLabel(questions, "Q31", a.Q31)),
    "入口": P.select(s.entryMode === "invite" ? "Invite" : "公開"),
    ...commonProps(s, adminUrl),
  };
}
