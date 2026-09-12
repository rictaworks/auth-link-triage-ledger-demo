import type { CycleServiceRef } from "../domain/graph";
import { MESSAGES } from "../config/messages";

/** requirements.md 6.2：循環を構成するサービス列を表示するための専用エラー。 */
export class LinkCycleError extends Error {
  readonly status = 409;
  readonly path: CycleServiceRef[];

  constructor(path: CycleServiceRef[]) {
    super(MESSAGES.linkCycleDetected);
    this.path = path;
  }
}

/**
 * requirements.md 6.2：2本目の主経路を登録しようとした際、
 * 既存の主経路を代替経路へ降格することを利用者に明示して選択させるための確認要求エラー。
 * ネイティブ confirm() は使用しないため、フロントエンドはこのレスポンスを見て
 * 独自の確認ダイアログを表示し、confirmDowngrade: true を付けて再送する。
 */
export class PrimaryRouteConfirmationRequiredError extends Error {
  readonly status = 409;
  readonly existingPrimaryLinkId: string;
  readonly existingProviderId: string;

  constructor(existingPrimaryLinkId: string, existingProviderId: string) {
    super(MESSAGES.linkDuplicatePrimaryConfirmRequired);
    this.existingPrimaryLinkId = existingPrimaryLinkId;
    this.existingProviderId = existingProviderId;
  }
}
