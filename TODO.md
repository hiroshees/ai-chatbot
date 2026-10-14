# 実行計画 TODO

CLAUDE.md（エンタメ系AIチャットボット）に基づく実装計画。上から順に進める。各フェーズ末尾の「検証」を満たしたら次へ進む。

## 着手前に決めること（要確認）

- [x] **AIモデル**: `gemini-3.6-flash`（Google Gemini 3.6 Flash）に変更。CLAUDE.md 更新済み
- [x] **履歴の保存先**: MongoDB Atlas（Prisma 経由）に決定。匿名セッションIDをセッションCookieで発行して履歴を紐付け、ブラウザを閉じたら到達不能にする（CLAUDE.md 更新済み）
- [x] **履歴の削除**: 行わない（TTL・定期ジョブなし）に決定（CLAUDE.md 更新済み）
- [x] **Atlas 無料枠（512MB）の容量**: いっぱいになったら警告するだけにする（自動削除・自動対処なし）。CLAUDE.md 更新済み
- [x] **容量警告の出し方**: アプリ側でモーダル画面に表示するだけにする（CLAUDE.md 更新済み）
- [x] **容量不足の検知方法**: 履歴の書き込みエラーから判定する（事前の容量監視はしない）。CLAUDE.md 更新済み
- [x] **容量超過エラーの判定条件**: 無料枠が満杯のときに Atlas が返すエラーコード/メッセージを調べ、判定条件を確定する（Phase 3 の実装時に公式ドキュメントで確認。実機での再現は難しいため、判定ロジックはモックでテストする）（確定: Atlas は書き込みを code 8000 / "you are over your space quota, using N MB of 512 MB" で拒否。`src/lib/storage-errors.ts`）
- [x] **Mastra Memory との役割分担**: 履歴の正を Prisma 側に置き、Agent へは毎回履歴を渡す方式に決定。Mastra Memory は使わない（CLAUDE.md 更新済み）
- [x] **Hono**: 使わず、Route Handler のみで実装する（CLAUDE.md 更新済み）
- [x] **キャラクター/ペルソナ**: 口語調のツンデレな女の子に決定（CLAUDE.md の「キャラクター設定」に記載）
- [x] **キャラクターの名前・人称**: 名前「なおか」、一人称「うち」、二人称「あんた」に決定（CLAUDE.md 更新済み）
- [ ] **セリフ例**: 挨拶、照れ隠し、エラー時などの例文を用意し、システムプロンプトに入れる（Phase 1 で仮案を作成して確認）
- [x] CLAUDE.md の整合性修正（アーキテクチャ方針と未決事項を更新済み）
- [x] CLAUDE.md の「(中略)」を削除（補完は不要）

## Phase 0: プロジェクト初期化

- [x] `pnpm create next-app`（App Router / TypeScript / Tailwind / ESLint）
- [x] TypeScript strict の確認
- [x] Vitest 導入（`pnpm test` スクリプト、サンプルテスト）
- [x] `.env.example` 作成、`.gitignore` に `.env*.local` を含める
- [x] ディレクトリ作成（`src/mastra`、`src/lib`、`src/components`、`tests`）
- [x] 初期コミット（依頼があれば）

**検証**: `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm test` / 型チェックが通る

## Phase 1: AIエージェント（バックエンド中核）

- [x] Mastra / Google 関連パッケージの最新ドキュメント確認（context7）
- [x] 依存追加（確認の上）: `@mastra/core`、モデルルーターのため追加プロバイダ不要
- [x] `src/mastra/` に Agent 定義（instructions にツンデレな女の子・口語調のペルソナ。例外時はツンを控える指示も含める）
- [x] 動作確認: 通常の質問・エラー説明・落ち込んだ相談の3パターンで口調と親切さを確認する（2026-10-10 実API確認済み）
- [x] 環境変数 `GOOGLE_API_KEY` の読み込み
- [x] Agent 単体の動作確認用スクリプト（実API、手動実行）。Mastra Memory は設定せず、メッセージ配列を渡して応答させる

**検証**: スクリプトからAgentに話しかけ、応答が返る

## Phase 2: チャットAPI（ストリーミング）

- [x] Node.js runtime でストリーミング応答する `POST /api/chat`（Route Handler）
- [x] リクエスト検証（メッセージ配列の形式、サイズ上限）
- [x] エラーハンドリング（APIキー不正、レート制限、タイムアウト、Gemini（Google）障害）をユーザー向けメッセージに変換
- [x] ログにシークレットや会話本文を出さない
- [x] Vitest: リクエスト検証・エラー変換のテスト（LLM呼び出しはモック）

**検証**: `curl` でストリーミング応答を受信でき、異常系で適切なエラーが返る

## Phase 3: セッション管理・履歴

- [x] Prisma + MongoDB Atlas のセットアップ（`MONGODB_URI`、`prisma generate`、接続の共通化）（`pnpm db:push` で接続・コレクション・インデックス作成を確認済み）
- [x] モデル定義（Session / Message。メッセージは sessionId・role・content・createdAt）
- [x] 匿名セッションIDの発行（ランダムな推測困難なID、`HttpOnly` / `SameSite` / `Secure` のセッションCookie、有効期限なし）
- [x] チャットAPIでセッションIDに紐付けて履歴を保存・取得し、Agent へ履歴を渡す
- [x] 履歴取得API（リロード時の復元）
- [x] `createdAt` / `sessionId` にインデックスを設定
- [x] 容量不足の検知: 履歴の書き込み（Prisma）で発生したエラーを判定関数に通し、容量超過ならAPIが専用のエラー種別を返す（その他のDBエラーと区別する。判定条件は上記で確定したものを使う）
- [x] 容量警告モーダルの実装: 検知時に警告をモーダルで表示する。閉じる操作のみで、削除などの操作ボタンは置かない（`StorageFullModal` を作成。画面への組み込みは Phase 4）
- [x] 容量超過時は履歴の保存をスキップし、AI応答は通常どおりストリーミングして会話を継続する（保存失敗でチャットを止めない）
- [x] 会話文脈の受け渡し: サーバーはDBから履歴を引けない場合があるため、クライアントがメモリ上のメッセージ一覧を毎回リクエストに含め、サーバーはそれをAgentへ渡す（DBは復元用の保存先として扱う）（API は毎回 `messages` を受け取り Agent に渡す。クライアント側の保持は Phase 4）
- [x] 警告モーダルは容量超過を検知した時点で1回表示し、閉じた後は同一セッション中に繰り返し出さない（未保存である旨も伝える）（`storage-warning.ts` の reducer で実装。画面への組み込みは Phase 4）
- [x] Vitest: 容量超過エラーの判定ロジックのテスト、保存失敗時も応答が返ることのテスト（DBエラーはモック）
- [x] 「新しい会話」ボタン（新しいセッションIDを発行して空の会話を開始する。過去の履歴は削除しない）（`POST /api/session` と `NewConversationButton` を作成。画面への組み込みは Phase 4）
- [x] 他セッションの履歴にアクセスできないことの確認
- [x] Vitest: 履歴の追加・取得、新規セッション開始、セッションID検証のテスト（DBはモックまたはテスト用DB）（インメモリのモックストアでテスト）

**検証**: リロードで履歴が復元され、ブラウザを閉じて開き直すと空の新規セッションになる（2026-10-10 実DB確認済み: 保存→履歴復元、Cookieなしは空、別セッションから見えない、新しい会話で空）

## Phase 4: チャットUI

- [x] チャット画面レイアウト（メッセージ一覧、入力欄、送信ボタン）
- [x] ストリーミング表示（逐次描画、生成中インジケータ、停止ボタン）
- [x] 自動スクロール、Enter 送信 / Shift+Enter 改行
- [x] エラー表示と再送
- [x] Markdown / コードブロックの表示
- [x] 空状態（ウェルカムメッセージ、サジェスト）

**検証**: ブラウザで会話を往復でき、エラー時も画面が壊れない（ブラウザ実機確認は未実施: Playwright の Chrome が環境に無いため。サーバー側は curl でページ表示・ストリーミングを確認済み）

## Phase 5: エンタメデザイン・テーマ・レスポンシブ

- [x] デザイントークン（カラー、フォント、グラデーション、アニメーション）
- [x] ダーク/ライトモード切り替え（OS設定への追従 + 手動切替、選択を保持）
- [x] レスポンシブ（スマホ / タブレット / PC）。入力欄とキーボード表示時の崩れを確認
- [x] アクセシビリティ最低限（コントラスト、フォーカス、aria-label）

**検証**: 3種類の画面幅 × 2テーマで目視確認（Playwright でスクリーンショット可）（目視は未実施: Playwright の Chrome が環境に無いため。lint・型チェック・テストと、SSR HTML にテーマ初期化スクリプトが含まれることのみ確認済み）

## Phase 6: 品質確認

- [x] `pnpm lint`、型チェック、`pnpm test` がすべて通る（71テスト通過、`pnpm build` も成功）
- [x] 5〜10人の同時接続を想定した負荷確認（簡易、同時ストリーミング）（`pnpm load:test`、本番ビルドで8同時接続 8/8 成功、初回トークン約3〜4.5秒・完了約3.5〜4.7秒）
- [x] APIキー・接続文字列がリポジトリやクライアントバンドルに含まれていないことを確認（`.next/static`・`public`・追跡ファイル・git履歴にキー/Atlasホストが無いことを確認。`.env.local` は未追跡）
- [x] 入力長・リクエスト頻度の簡易制限（コスト暴走防止）（入力長は Phase 2 の検証で制限済み。頻度はセッション12回/分・IP60回/分のインメモリ制限を `src/lib/rate-limit.ts` に実装、超過は 429 + `Retry-After`。実機で13回目から429を確認）

## Phase 7: Google Cloud Run デプロイ

- [x] `next.config` で `output: 'standalone'` を設定(設定済み)
- [x] マルチステージ `Dockerfile` と `.dockerignore` 作成(node:24-slim の3段構成、openssl 導入、非root実行、PORT=8080)
- [x] ローカルで `docker build` / `docker run` による動作確認(コンテナ上で `/` が200、`/api/chat` のストリーミング応答を確認。`docker --env-file` は引用符を外さないため、引用符付きの `.env.local` をそのまま渡すとAPIキーが無効になる点に注意)
- [x] Google Cloud プロジェクト作成、Cloud Run / Cloud Build / Artifact Registry の有効化(プロジェクト `ai-chatbot-511405`、リージョン asia-northeast1。Secret Manager も有効化、Artifact Registry リポジトリ `ai-chatbot` 作成。有効化直後は一時的に権限エラーが出るため少し待って再実行する)
- [x] Secret Manager に `GOOGLE_API_KEY` と `MONGODB_URI` を登録し、Cloud Run に注入(デフォルトのコンピュートSAに accessor 権限を付与、`--set-secrets` で注入)
- [x] Cloud Build でイメージをビルドし、Cloud Run にデプロイ(`gcloud builds submit --tag …/ai-chatbot/app:v1` → サービス `ai-chatbot`、URL: https://ai-chatbot-599407179827.asia-northeast1.run.app)
- [x] Cloud Run の設定（タイムアウト300秒、最大インスタンス1、同時実行40、メモリ512Mi。レート制限がインメモリのため最大1にして正確性を保つ）
- [x] MongoDB Atlas のネットワークアクセス許可を設定（Cloud Run の送信元IPは固定でないため `0.0.0.0/0` を許可。接続文字列の認証情報が防御になるため強いパスワードを維持する）
- [x] 本番URLでストリーミング・テーマ・レスポンシブを確認（2026-10-12 curl でストリーミング・履歴保存/復元・他セッション非公開を確認、Playwright でスマホ幅/PC幅×ダーク/ライトを目視確認）

**検証**: 公開URLで会話でき、ストリーミングが途切れない（確認済み）

## Phase 8: 仕上げ

- [x] CLAUDE.md を実装の実態に合わせて更新
- [x] README（セットアップ、環境変数、コマンド、デプロイ手順）
- [x] 拡張候補（認証、履歴永続化、複数モデル、テンプレート、管理画面）を Issue 化（拡張予定なしのため Issue は作成しない）

## 残タスク（2026-10-12 コード確認で洗い出し）

`pnpm lint` / 型チェック / `pnpm test`（71件）は通過済み。以下は仕様（CLAUDE.md）と現状コードの差分、および運用上の不足。優先度は目安。着手前にユーザーへ確認する。

## Phase 9: セキュリティ対策

- [x] CSRF 対策の確認（Cookie は `SameSite=Lax` 設定済みのうえ、`POST /api/chat`・`POST /api/session` に Origin 検証を追加。別オリジンは 403。Origin を送らない curl・負荷試験は許可。`src/lib/origin.ts`）
- [x] 入力値の検証の見直し（`/api/history`・`/api/session` は入力がセッションID Cookie のみで、形式検証済みのため変更なし。`/api/chat` はパース前にボディ全体の上限 `MAX_BODY_LENGTH` を追加）
- [x] セキュリティヘッダーの設定（CSP、X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy、本番のみ HSTS。`next.config.ts` の `headers()` と `src/lib/security-headers.ts`。同一オリジン構成のため CORS 設定は不要。インラインスクリプトのため script-src に `'unsafe-inline'` が必要）

**検証**: レスポンスヘッダーに設定が反映され、チャットの動作・テーマ・Markdown 表示が壊れない（確認済み: 本番ビルドで curl によりヘッダーと CSRF の 403 を確認、Playwright で1往復の会話とテーマ切り替えがコンソールエラーなしで動作。Markdown・コードブロックの表示は目視未確認）

## Phase 10: レート制限の適用範囲拡大

- [ ] `GET /api/history` と `POST /api/session` に既存の `RateLimiter`（`src/lib/rate-limit.ts`）を適用する（`POST /api/chat` はセッション12回/分・IP60回/分で実装済み）
- [ ] 上記の超過時に 429 + `Retry-After` を返し、クライアントで適切なメッセージを表示する
- [ ] Vitest: 追加した制限のテスト

**検証**: 制限超過時に 429 が返り、画面が壊れない

## Phase 11: 環境変数とログ管理

- [ ] 環境変数の検証（`GOOGLE_API_KEY`・`MONGODB_URI` が未設定のとき、起動時または初回利用時に分かりやすいエラーにする）
- [ ] ログの整理（ログレベルの使い分け。シークレットと会話本文を出さない方針は維持）
- [ ] 構造化ログ・エラー追跡サービス（Sentry 等）の導入は、依存追加になるため要否をユーザーに確認してから決める

## Phase 12: 運用確認

- [ ] ヘルスチェック用エンドポイントの追加と、Cloud Run のヘルスチェック設定の要否の判断（現状は未実装）
- [ ] Atlas 無料枠（M0）の自動バックアップの有無を確認し、必要ならバックアップ方針を決める
- [ ] Cloud Run のメモリ使用量・レスポンスタイムを Cloud Monitoring で確認する（APM などの追加導入は規模に対して過剰のため行わない）

## Phase 13: CI/CD の拡充

`.github/workflows/ci.yml` で lint・型チェック・テスト・ビルドは実行済み。以下は不足分。

- [ ] コードカバレッジレポートの出力（要否を確認してから追加）
- [ ] 自動デプロイ（Cloud Run へのデプロイをワークフロー化するか判断。GCP 認証情報の扱いは要確認）

## 注意

- ストリーミングは Edge runtime を使わず、Node.js runtime で実装する
- Cloud Run でストリーミングが途切れないようタイムアウトとバッファリングに注意する
- 依存追加・設計変更の前にはユーザーに確認する
- 各ライブラリのAPIは実装前に最新ドキュメントで確認する
