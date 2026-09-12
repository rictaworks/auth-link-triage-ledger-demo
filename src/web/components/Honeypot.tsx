"use client";

import { useState } from "react";

/**
 * requirements.md 19章：Bot対策はハニーポット方式（reCAPTCHA不使用）。
 * 通常の利用者には見えない入力欄を用意し、値が入っていればBotとみなしてAPI側で静かに破棄する。
 */
export function useHoneypot() {
  const [value, setValue] = useState("");

  const field = (
    <input
      type="text"
      name="hp"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", opacity: 0 }}
    />
  );

  return { honeypotValue: value, honeypotField: field };
}
