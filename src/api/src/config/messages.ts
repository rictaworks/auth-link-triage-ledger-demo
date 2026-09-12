/**
 * API が返す利用者向け文言（ですます調）の一元管理。
 * ハードコードチェックのテスト（src/api/src/config/messages.test.ts, src/web/test/hardcodedStrings.test.ts）が
 * この設定ファイル外への日本語リテラル混入を検出する。
 */
export const MESSAGES = {
  serviceNameRequired: "サービス名を入力してください。",
  serviceNameTooLong: "サービス名は50文字以内で入力してください。",
  serviceNameDuplicate: "同じ名称のサービスがすでに登録されています。",
  serviceNotFound: "指定されたサービスが見つかりません。",
  serviceLimitExceeded: "登録できるサービス数の上限（50件）に達しています。",
  serviceDeleteRejectedHasDependents:
    "このサービスは他のサービスの提供元になっているため削除できません。先に連携を削除してください。",
  noteTooLong: "備考は200文字以内で入力してください。",

  linkSelfReference: "同じサービスを依存側と提供元に指定することはできません。",
  linkCycleDetected: "この連携を追加すると連携が循環してしまいます。",
  linkLimitExceeded: "登録できる連携数の上限（100件）に達しています。",
  linkNotFound: "指定された連携が見つかりません。",
  linkDuplicatePrimaryConfirmRequired:
    "このサービスにはすでに主経路が設定されています。既存の主経路を代替経路に変更してよろしいですか。",
  linkAlternateHasNoPropagation: "代替経路には伝播種別を設定できません。",

  stepBodyRequired: "手順の内容を入力してください。",
  stepBodyTooLong: "手順は200文字以内で入力してください。",
  stepLimitExceeded: "登録できる手順数の上限（30件）に達しています。",
  stepCredentialWarning:
    "パスワード・ワンタイムコード・復旧コード・秘密の質問の答えは記録しないでください。",

  observationFutureTime: "未来の時刻を観測時刻として登録することはできません。",
  observationServiceRequired: "観測の対象サービスを選択してください。",
  observationLimitExceeded: "登録できる観測数の上限（500件）に達しています。",

  triggerFutureTime: "契機事象の発生時刻は現在より前の時刻を指定してください。",
  triggerLimitExceeded: "登録できる契機事象数の上限（100件）に達しています。",

  originNotInPredictedSet: "選択した起点は、直近の切り分け結果の候補に含まれていません。",
  noActiveCase: "進行中の切り分けケースがありません。",

  sessionInvalid: "セッションが無効です。ページを再読み込みしてください。",
  validationFailed: "入力内容を確認してください。",
  notFound: "指定されたデータが見つかりません。",
  internalError: "処理中にエラーが発生しました。時間をおいて再度お試しください。"
} as const;

export type MessageKey = keyof typeof MESSAGES;
