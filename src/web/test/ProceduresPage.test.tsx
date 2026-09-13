import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProceduresPage from "@/app/procedures/page";
import { ToastProvider } from "@/components/ToastProvider";
import { apiClient } from "@/lib/apiClient";
import { STRINGS } from "@/config/strings";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("originId=origin-1")
}));

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() }
}));

vi.mock("@/lib/useLedger", () => ({
  useLedger: () => ({
    services: [
      { id: "origin-1", name: "Google", note: "", createdAt: "2026-01-01T00:00:00Z" },
      { id: "dep-1", name: "Gmail", note: "", createdAt: "2026-01-01T00:00:00Z" }
    ],
    links: [],
    templates: [],
    loading: false,
    reload: vi.fn()
  })
}));

function renderPage() {
  return render(
    <ToastProvider>
      <ProceduresPage />
    </ToastProvider>
  );
}

describe("ProceduresPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({
      caseId: "case-1",
      originId: "origin-1",
      windowStart: "2026-01-01T00:00:00Z",
      windowEnd: "2026-01-02T00:00:00Z",
      skipped: [],
      entries: [{ serviceId: "dep-1", recorded: false, steps: [], alternateHint: null }]
    });
  });

  it("最後のサービスの再ログイン完了でケースが解決した直後は、再取得エラーではなく解決済み表示にする", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ caseResolved: true });
    renderPage();

    await screen.findByText("Gmail");
    fireEvent.click(screen.getByRole("button", { name: STRINGS.procedures.completeButton }));

    await waitFor(() => {
      expect(document.querySelector(".empty-state")?.textContent).toBe(STRINGS.procedures.caseResolved);
    });

    // ケース解決後、進行中のケースが無いはずの /api/relogin を再取得しない
    // （再取得すると本番で実際に発生した400エラーを再現してしまう）。
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it("ケースが未解決のまま完了した場合は、通常どおり再取得して最新の手順を表示する", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ caseResolved: false });
    renderPage();

    await screen.findByText("Gmail");
    fireEvent.click(screen.getByRole("button", { name: STRINGS.procedures.completeButton }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText(STRINGS.procedures.caseResolved)).not.toBeInTheDocument();
  });
});
