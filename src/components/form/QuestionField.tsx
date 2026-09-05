"use client";

import type { AnswerValue, Answers, Option, Question } from "@/engine/types";
import { ConsentField, MultiSelectField, ScaleField, SingleSelectField, TextField } from "./fields";

export function QuestionField(props: {
  q: Question;
  answers: Answers;
  options?: Option[];
  error?: string;
  onChange: (id: string, v: AnswerValue) => void;
  piiHintText?: string;
}) {
  const { q, answers, options, error, onChange, piiHintText } = props;
  const common = { q, value: answers[q.id], onChange: (v: AnswerValue) => onChange(q.id, v), error, options, piiHintText };
  switch (q.type) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
    case "url":
      return <TextField {...common} />;
    case "single_select":
      return <SingleSelectField {...common} />;
    case "multi_select":
      return <MultiSelectField {...common} />;
    case "scale":
      return <ScaleField {...common} />;
    case "consent":
      return <ConsentField {...common} />;
  }
}
