import type { FormDefinition, FormSlug } from "@/engine/types";
import { communityV1 } from "./community";
import { genericCscV1 } from "./generic_csc";
import { highTicketV1 } from "./high_ticket";

export const canonicalForms: Record<FormSlug, FormDefinition> = {
  generic_csc: genericCscV1,
  high_ticket: highTicketV1,
  community: communityV1,
};

export const FORM_SLUGS: FormSlug[] = ["community", "generic_csc", "high_ticket"];

export function isFormSlug(s: string): s is FormSlug {
  return (FORM_SLUGS as string[]).includes(s);
}
