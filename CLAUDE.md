# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Safety Rules

## 削除系コマンドの禁止（重要）

以下のルールはこのワークスペース内のすべての会話で絶対に守られる：

- Claude はファイルまたはディレクトリを削除するコマンドを一切生成してはならない。
  例：rm, rm -rf, rm *, rmdir, unlink, cache --delete,
      lftp mirror --delete, rsync --delete, git clean -df, find -delete 等。

- 削除が必要な場合でも、Claude は削除コマンドを提案せず、
  「手動で削除してください」といった説明に留めること。

- 削除の推奨・削除操作の自動判断も禁止。

- ssh / lftp / デプロイ系スクリプトを生成する場合でも、
  削除コマンドの生成は禁止。

これらはすべての会話・コード生成に適用される。

## シークレット管理（重要）

- `config/master.key` など機密ファイルを `git add` するコードを生成してはならない
- デプロイスクリプト・セットアップ手順でも同様
- シークレットは必ず環境変数（RAILS_MASTER_KEY 等）で渡すこと
- `.gitignore` への追加を確認する手順を必ずコードに含めること
- 初回コミット前に `git status` でステージング確認を促すこと

---

## プロジェクト概要

**連携認証台帳（デモ版）**。「Google でログイン」等の連携認証は 1 つの提供元アカウントの認証状態に多数のサービスのログインが依存しており、提供元の失効（パスワード変更・端末変更等）が起きると依存サービスが時間差で次々にログイン失敗を起こす。しかし利用者に見えるのは末端サービスの失敗表示だけで、どの提供元が失効の起点かを特定できない。

本リポジトリは、サービス間の認証依存を台帳として記録し、利用者が申告する観測（失敗／稼働）から失効の起点をグラフ探索で切り分け、記録済みの再ログイン手順を依存順（提供元→依存側）に提示するデモアプリを実装する。**提供元の認証状態をネットワーク越しに照会することはなく、資格情報（パスワード・OTP・復旧コード等）は一切保持しない**——台帳・観測・契機事象はすべて利用者の自己申告として記録し、切り分けは記録された依存関係と観測の整合のみから導く。

仕様の正は [`requirements.md`](requirements.md) （ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図を含む）。実装前に必ず参照すること。本ファイルには要約と横断的な注意点のみを記す。

**現状（2026-09-13時点）：テンプレート設置のみで実装コードは未着手。** `src/` 以下の実装は最初の（かつ唯一の）Issue で作成する。

## アーキテクチャ（requirements.md 2.3 / 5 / 11 が正）

デモ版の簡略構成として **Cloudflare 一本化**を採用する（AI・解析・重い処理を持たないため）。

| 層 | 技術 | デプロイ先 |
|---|---|---|
| フロントエンド | Next.js（TypeScript・静的書き出し） | Cloudflare Pages |
| アプリケーション | Cloudflare Workers（TypeScript） | Cloudflare |
| DB | D1（SQLite） | Cloudflare |

- 日次リセット（JST 03:00・全テーブル削除）は Cron Trigger から Worker を起動して実行する。
- フロントエンドとアプリケーションの通信は同一システム内の通信であり、外部 API 呼び出しには該当しない。フロントエンドから API への到達経路（同一オリジン化・Worker Route 等）は、同構成の先例である `rictaworks/org-cube-model-router-demo`（`/api/*` をゾーンの Worker Route で振り向け）を参考にできる。
- 認証・認可は設計に組み込まない（requirements.md 4.2 / 19）。**Cookie ベースのセッションキーがオーナーキー**であり、`sessions` を含む全テーブルが `session_id` を持ち、参照条件に必ず含める（セッションをまたいだレコードの参照・操作を防止すること）。
- Bot 対策はハニーポット方式。reCAPTCHA は用いない。

### 切り分けロジック（requirements.md 8章が正・多数ファイルをまたぐため要約）

失効起点の切り分けは「候補列挙 → 候補ごとの評価（説明できる失敗／矛盾する稼働／未観測の予測／契機の有無）→ 矛盾がある候補の除外 → 4段階の優先順位での順位付け → 複数起点への再帰的な適用（最大3つ）→ 確認推奨の生成」という決定的なパイプラインである。**主経路のみを辿って伝播を計算し、代替経路は失効を伝播しない。** 切り分けは観測・契機事象・連携のいずれかの変更のたびに再計算し、過去の計算結果を保持しない（状態を持たせない設計にすること）。同一入力に対し常に同一の結果を返す決定性が要件（18章）。

## 開発フロー

- **実装方式：1 issue のワンショットで実装する**（requirements.md 18章）。複数 Issue に分割しない。
- ブランチワークフロー：`src/**` の変更は main に直接コミット・プッシュせず、必ずブランチを切って `gh pr create` で PR を作成する。`src/**` 以外（このファイル・`DOCS/`・`SPEC/` 等）は main への直接 push を許可する。
- **AIセッティング（CLAUDE.md本文・`.claude/`配下の設定・エージェント定義等）はPRを作らず、必ずmainブランチで直接コミット・pushすること。** PR化しない。
- **デモ版のため公開スピードを優先し、正式な code-review・audit・security-gate・report を省略してよい**。フローは `issue → setting & coding → security review → add, commit, push → reviewer & pr-checker → merge → user test` のみとする（merge で本番デプロイされる構成が前提）。
- コミット前に必ずセキュリティレビューを行うこと。マージ前に必ず reviewer と pr-checker を実行すること（`.claude/agents/` に定義。後述）。
- TDD 厳守：plan → red test → coding → green test。フロントの確認は curl / wget --mirror / playwright で行う。
- 時刻は JST、エンコードは UTF-8。日本語版のみ開発する（requirements.md の対象外に多言語化は含まれない）。
- 文字列リテラルは設定ファイル／DB に分離し、ハードコードを検出するテストを書くこと。
- ネイティブの `alert()` / `confirm()` / `prompt()` は使用禁止。フォールバック禁止（例外処理を明示的に書く）。
- デフォルトアイコンは FontAwesome。絵文字は使用しない。
- 環境変数は `.env`（`.env.example` がテンプレート）を参照する。開発環境・本番環境の判定を実装し分岐できるようにする。
- バージョン番号は `メジャー2桁.マイナー2桁.デバッグ2桁`（初期値 `01.01.00`）。タグは最初から `git tag -a`（注釈付き）。
- コンテンツ（画面文言等）は**ですます調**で統一する（だである調禁止）。

## コマンド

**未実装のため build/lint/test コマンドは存在しない。** 最初の Issue で Next.js（フロントエンド）・Cloudflare Workers（API）のプロジェクトを `src/` 以下に構築する際に、実際のコマンドをこのファイルに追記すること。テストフレームワークは TypeScript スタック（Jest 等）を想定するが未確定——選定したら `DOCS/TM.md` の記述と整合させて記録すること。

## 参照ドキュメント

| ファイル | 用途 |
|---|---|
| `requirements.md` | 仕様の正（用語定義・スコープ・画面仕様・ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図） |
| `DOCS/CRAP.md` | デザイン4原則（Contrast / Repetition / Alignment / Proximity） |
| `DOCS/DP.md` | 開発原則（YAGNI/KISS/DRY/SOLID等） |
| `DOCS/TM.md` | テストメソッド・フレームワーク概要 |
| `.claude/CC.md` | コンプライアンス10項目 |
| `.claude/OWASP10.md` | OWASP Top 10（セキュリティレビュー基準） |
| `.claude/QC10.md` | 品質管理10項目 |
| `.claude/TEST-HARNESS-SAFETY.md` | テストハーネスの安全性チェックリスト |
| `.claude/Manager.md` | プロジェクト管理指針 |
| `.claude/auto-optimizer.md` | CLAUDE.md 自動最適化エージェント用プロンプト |
| `.claude/init-prompt.md` | 本 CLAUDE.md 生成時に `rictaworks/context` の `ClaudeCode.md` から抽出した適用済みルール一覧（コミット対象外・参照用） |

## Sub Agent（`.claude/agents/` 作成時にそのまま使う定義）

- **pr-checker**：レビューはしない。PR のタイトルと本文を日本語にする。非エンジニア（ブラウザしか使わない利用者）向けのユーザーテスト手順を PR 本文に丁寧に書く。
- **tester**：全 PR を対象に、PR に書かれたユーザーテスト手順の実行スクリプトを作成する（`DOCS/TM.md` に記載のテストを含む）。テストは `test/pr***/` に作成し、対象は開発サーバーとする。
- **reviewer**：issue の受け入れ要件を満たすこと、および `.claude/CC.md`・`.claude/OWASP10.md`・`.claude/QC10.md`・`DOCS/CRAP.md`・`DOCS/DP.md`・`DOCS/TM.md` を満たすことを検証する。
