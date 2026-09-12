/**
 * 画面文言の一元管理（ですます調で統一）。
 * ハードコード検出テスト（test/hardcodedStrings.test.ts）が、この設定ファイル外への
 * 日本語文字列の直接埋め込みを検出する。
 */
export const STRINGS = {
  app: {
    title: "連携認証台帳（デモ版）",
    disclaimer:
      "この画面の切り分け結果は、台帳と申告内容の整合から導いた推定です。提供元の実際の認証状態を照会するものではありません。",
    noPersonalDataNotice:
      "氏名・メールアドレス・アカウントID・パスワード等は入力しないでください。このアプリはサービス名称と依存関係のみを記録します。"
  },
  nav: {
    ledger: "台帳",
    triage: "切り分け",
    procedures: "手順"
  },
  common: {
    save: "保存する",
    cancel: "キャンセル",
    delete: "削除する",
    edit: "編集する",
    add: "追加する",
    close: "閉じる",
    confirm: "実行する",
    loading: "読み込み中です…",
    empty: "登録されているデータはありません。",
    unrecorded: "未記録",
    unknownService: "不明なサービス"
  },
  ledger: {
    heading: "台帳",
    serviceListHeading: "サービス一覧",
    dependencyGraphHeading: "依存図",
    addServiceHeading: "サービスを追加する",
    addLinkHeading: "連携を追加する",
    templateHeading: "提供元テンプレートから選ぶ",
    nameLabel: "サービス名",
    namePlaceholder: "例：Google",
    noteLabel: "備考（任意）",
    kindProvider: "提供元",
    kindDependent: "依存側",
    kindRelay: "中継",
    kindIsolated: "未連携",
    hasStepsYes: "記録あり",
    hasStepsNo: "未記録",
    columnName: "名称",
    columnKind: "種別",
    columnProvider: "主経路の提供元",
    columnPropagation: "伝播種別",
    columnSteps: "手順",
    columnActions: "操作",
    propagationImmediate: "即時",
    propagationDelayed: "遅延",
    routePrimary: "主経路",
    routeAlternate: "代替経路",
    deleteConfirmTitle: "サービスを削除しますか？",
    deleteConfirmBody: "この操作は取り消せません。削除してよろしいですか。",
    cycleRejectedTitle: "この連携は登録できません",
    cycleRejectedBody: "以下のサービスをたどる循環になってしまいます。",
    primaryDowngradeConfirmTitle: "既存の主経路を代替経路に変更しますか？",
    primaryDowngradeConfirmBody:
      "このサービスにはすでに主経路が設定されています。新しい主経路を登録すると、既存の主経路は代替経路に変更されます。",
    dependentLabel: "依存側のサービス",
    providerLabel: "提供元のサービス",
    routeLabel: "経路種別",
    propagationLabel: "伝播種別",
    linkAddSuccess: "連携を追加しました。",
    serviceAddSuccess: "サービスを追加しました。",
    serviceUpdateSuccess: "サービスを更新しました。",
    serviceDeleteSuccess: "サービスを削除しました。",
    linkDeleteSuccess: "連携を削除しました。"
  },
  procedureEditor: {
    heading: "再ログイン手順の編集",
    serviceSelectLabel: "編集するサービス",
    stepBodyPlaceholder: "例：メールアプリを開き、届いた確認コードを入力する",
    addStepButton: "手順を追加する",
    moveUp: "上へ移動する",
    moveDown: "下へ移動する",
    removeStep: "この手順を削除する",
    credentialWarning:
      "パスワード・ワンタイムコード・復旧コード・秘密の質問の答えは、ここに記録しないでください。",
    saveSuccess: "手順を保存しました。"
  },
  observation: {
    heading: "観測を申告する",
    serviceLabel: "対象サービス（観測）",
    statusLabel: "状況",
    statusFailed: "失敗した",
    statusWorking: "問題なく使えている",
    observedAtLabel: "観測時刻",
    useNow: "現在時刻を使う",
    submit: "この観測を記録する",
    submitSuccess: "観測を記録しました。",
    futureRejected: "未来の時刻は指定できません。"
  },
  trigger: {
    heading: "契機事象を記録する",
    serviceLabel: "対象サービス（契機事象）",
    kindLabel: "種別",
    occurredAtLabel: "発生時刻",
    submit: "この契機事象を記録する",
    submitSuccess: "契機事象を記録しました。",
    kinds: {
      password_change: "パスワード変更",
      mfa_reset: "多要素認証の再設定",
      device_change: "端末の変更・初期化",
      logout_all_devices: "全端末からのログアウト",
      account_recovery: "アカウント復旧"
    }
  },
  triage: {
    heading: "切り分け",
    currentStatusHeading: "現在の状況",
    originCandidatesHeading: "起点候補",
    excludedCandidatesHeading: "除外された候補",
    multiOriginHeading: "複数起点",
    unexplainedHeading: "未説明の失敗",
    recommendationsHeading: "確認推奨",
    caseHeading: "ケース",
    noCase: "現在、進行中の切り分けケースはありません。",
    windowRangeLabel: "この結果は次の観測窓に基づいています",
    explainedLabel: "説明できる失敗",
    unobservedLabel: "未観測の予測",
    hasTriggerLabel: "契機事象あり",
    noTriggerLabel: "契機事象なし",
    singleOriginInsufficient: "この候補だけでは、すべての失敗を説明できません。",
    selectOriginButton: "この起点を選んで手順を見る",
    rationale: {
      explained_count: "説明できる失敗の数が最も多いため",
      has_trigger: "契機事象が記録されているため",
      unobserved_count: "未観測の予測が少ないため",
      depth: "主経路の上流に近いため"
    },
    exclusionReason: {
      self_working: "候補自身が失効開始時刻以降に稼働と観測されているため",
      immediate_path_to_working: "即時の連携のみで到達する稼働サービスと矛盾するため"
    },
    recommendationHint: "この観測は、次の起点候補を区別する手がかりになります。",
    caseStates: {
      open: "受付中",
      triaged: "切り分け済み",
      origin_selected: "起点選択済み",
      resolved: "解決済み",
      discarded: "破棄済み"
    }
  },
  procedures: {
    heading: "手順",
    reloginOrderHeading: "再ログイン順序",
    noOriginSelected: "起点が選択されていません。切り分け画面から起点を選んでください。",
    skippedNotice: "すでに稼働が確認できているため、順序から除外しました。",
    alternateHint: "代替経路で先にログインできます",
    completeButton: "再ログインが完了した",
    completeSuccess: "再ログイン完了を記録しました。",
    caseResolved: "すべてのサービスの稼働が確認できたため、このケースは解決しました。"
  },
  templates: {
    google: "Google",
    apple: "Apple",
    microsoft: "Microsoft",
    line: "LINE",
    yahoo_japan: "Yahoo! JAPAN",
    meta: "Meta（Facebook）",
    x: "X（旧Twitter）",
    github: "GitHub",
    amazon: "Amazon",
    discord: "Discord",
    slack: "Slack",
    dropbox: "Dropbox"
  },
  errors: {
    generic: "処理中にエラーが発生しました。時間をおいて再度お試しください。",
    network: "通信に失敗しました。接続を確認してもう一度お試しください。"
  }
} as const;
