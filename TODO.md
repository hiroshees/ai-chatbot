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

### 高: 仕様との差分・コスト/障害リスク

- [ ] **停止・失敗時に履歴が保存されない**: 履歴は応答が `done` になった時点でしか保存しない（`src/lib/chat-stream.ts` の `withPersistence`）。停止ボタンで中断した場合や応答エラーの場合、画面には残るユーザー発言・途中の応答がリロードで消える。中断時も途中までの応答を保存するか、ユーザー発言だけでも先に保存するかを決めて実装する
- [ ] **履歴復元が全件読み込み**: `GET /api/history`（`src/lib/history-store.ts` の `list`）に件数上限がない。「メッセージ数の制限なし」でデータが溜まると復元が重くなる。直近N件の取得、または古い分の段階的な読み込みにする。なお Agent に渡す文脈は直近50件/20,000文字に切り詰める（`selectMessagesForRequest`）ため、画面の履歴と文脈が一致しない点も仕様として明記する
- [ ] **出力トークン数の上限が未設定**: `src/mastra/naoka-agent.ts` に `maxOutputTokens` 等の指定がない。頻度制限はインメモリでインスタンス再起動時にリセットされるため、コスト暴走の抑止として上限を設ける
- [ ] **GCP の予算アラート未設定**: 認証なしで公開しているため、Gemini の利用料と Cloud Run の費用に予算アラートを設定する（Cloud Billing の予算）
- [ ] **`/api/history` と `/api/session` に頻度制限がない**: `POST /api/chat` だけが制限対象。DB読み取り・Cookie発行も `RateLimiter` の対象にするか検討する

### 中: 品質・保守性

- [ ] **セリフ例の確認**（着手前の未決事項）: `src/mastra/naoka-instructions.ts` のセリフ例は仮案のまま。内容を確定して、冒頭コメント「確認待ち」を外す
- [ ] **容量超過以外の保存失敗が無通知**: DBエラー（接続断など）で保存に失敗しても、ユーザーには何も出ない（`saveExchangeSafely` が `"error"` を返すだけ）。仕様にはないため、通知するか（または現状のままログのみとするか）を決める
- [ ] **`Session` モデルが実質未使用**: `saveExchange` が毎回 `session.upsert` を行うが、どこからも読まれない。不要な書き込み（容量も消費）なので、モデルごと削除するか、使い道を決める
- [ ] **保存が非原子的**: `saveExchange` は upsert と `createMany` を別々に実行する。途中で失敗するとユーザー発言だけが残りうる。トランザクション不可（MongoDB の構成による）なら1回の書き込みにまとめる
- [ ] **API Route Handler のテストがない**: `tests/` はロジック単体のみ。`/api/chat`（検証・429・保存失敗時の継続）と `/api/history` の結合的なテストを、LLM・DBをモックして追加する

### 低: 仕上げ・任意

- [ ] create-next-app の雛形が残っている: `public/` の `file.svg` / `globe.svg` / `next.svg` / `vercel.svg` / `window.svg`（未使用）と、既定の `src/app/favicon.ico`。不要なものを削除し、アプリ用のアイコンに差し替える
- [ ] コールドスタート対策: Cloud Run は最小インスタンス0。初回アクセスが遅い場合は `--min-instances 1` を検討する（費用が増える）
- [ ] Atlas の `0.0.0.0/0` 許可の見直し: 利用が増えた場合は Cloud NAT と静的IPで送信元を固定する
- [ ] 容量超過モーダルの本番での実機確認: Atlas 満杯の再現は難しいため、判定ロジックのモックテスト止まり。実際に満杯になった際の挙動をログで確認する

## 注意

- ストリーミングは Edge runtime を使わず、Node.js runtime で実装する
- Cloud Run でストリーミングが途切れないようタイムアウトとバッファリングに注意する
- 依存追加・設計変更の前にはユーザーに確認する
- 各ライブラリのAPIは実装前に最新ドキュメントで確認する
