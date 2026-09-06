"use client";

import { useActionState, useState } from "react";
import { btnCls, btnSecondaryCls } from "./ui";

export interface EditorState {
  ok?: boolean;
  message?: string;
  issues?: Array<{ path: string; message: string }>;
  warnings?: Array<{ path: string; message: string }>;
  savedVersionId?: string;
}

export function DefinitionEditor(props: {
  action: (prev: EditorState, formData: FormData) => Promise<EditorState>;
  hidden: Record<string, string>;
  initialJson: string;
  previewHref?: string;
  canPublish: boolean;
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState<EditorState, FormData>(props.action, {});
  const [text, setText] = useState(props.initialJson);
  let localParseError: string | null = null;
  try {
    JSON.parse(text);
  } catch (e) {
    localParseError = e instanceof Error ? e.message : "JSON 格式錯誤";
  }
  return (
    <form action={action} className="space-y-3">
      {Object.entries(props.hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <textarea
        name="json"
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={props.readOnly}
        spellCheck={false}
        rows={28}
        className="w-full rounded-md border border-stone-300 bg-stone-50 p-3 font-mono text-xs leading-relaxed text-stone-900 outline-none focus:border-stone-900"
      />
      {localParseError && <p className="text-sm text-red-600">JSON 無法解析：{localParseError}</p>}
      {state.message && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      {state.issues && state.issues.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600">
          {state.issues.map((i, idx) => <li key={idx}><span className="font-mono text-xs">{i.path}</span> {i.message}</li>)}
        </ul>
      )}
      {state.warnings && state.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-700">
          {state.warnings.map((i, idx) => <li key={idx}><span className="font-mono text-xs">{i.path}</span> {i.message}</li>)}
        </ul>
      )}
      {!props.readOnly && (
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intent" value="save" disabled={pending || Boolean(localParseError)} className={btnSecondaryCls}>儲存草稿並驗證</button>
          {props.canPublish && (
            <button type="submit" name="intent" value="publish" disabled={pending || Boolean(localParseError)} className={btnCls}>發布為新版本</button>
          )}
          {props.previewHref && <a href={props.previewHref} target="_blank" rel="noopener" className={btnSecondaryCls}>預覽草稿</a>}
        </div>
      )}
    </form>
  );
}
