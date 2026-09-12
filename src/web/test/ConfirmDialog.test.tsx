import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("open=false のときは何も表示しない", () => {
    render(
      <ConfirmDialog open={false} title="title" body="body" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("open=true のとき、確認・キャンセルの操作でコールバックを呼ぶ", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="確認" body="本当に実行しますか" onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("実行する"));
    expect(onConfirm).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText("キャンセル"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
