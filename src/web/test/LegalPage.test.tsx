import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LegalPage from "@/app/legal/page";
import { STRINGS } from "@/config/strings";

describe("LegalPage", () => {
  it("利用規約・免責事項・連絡先の3セクションと連絡先情報を表示する（デモ共通の必須4要素の一つ）", () => {
    render(<LegalPage />);
    expect(screen.getByRole("heading", { name: STRINGS.legal.termsHeading })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: STRINGS.legal.disclaimerHeading })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: STRINGS.legal.contactHeading })).toBeInTheDocument();
    expect(screen.getByText("info@rictaworks.jp")).toBeInTheDocument();
  });
});
