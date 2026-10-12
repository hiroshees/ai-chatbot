# AIチャットボット「なおか」

ツンデレな女の子「なおか」とおしゃべりできる、エンタメ目的のAIチャットボット。

- Next.js (App Router) / React / TailwindCSS / TypeScript
- Mastra（Agent）+ Gemini 3.6 Flash（`gemini-3.6-flash`）
- Prisma + MongoDB Atlas（会話履歴）
- Google Cloud Run にデプロイ

## 仕組み

- `POST /api/chat`: メッセージ配列を受け取り、Mastra の Agent の応答をストリーミング（NDJSON）で返す。Node.js runtime で動作する。
- `GET /api/history`: セッションの履歴を返す（リロード時の復元用）。
- `POST /api/session`: 新しい匿名セッションを発行する（「新しい会話」）。
- 匿名セッションIDはセッションCookie（有効期限なし）で発行し、履歴をセッションIDに紐付ける。ブラウザを閉じると以前の履歴には到達できない。
- 履歴は削除しない。Atlas 無料枠（512MB）が満杯になり書き込みに失敗した場合は、警告モーダルを出し、履歴を保存せずに会話だけ継続する。
- リクエスト頻度制限はインメモリ（セッション12回/分・IP60回/分）。そのため Cloud Run の最大インスタンス数は1にしている。

## セットアップ

必要なもの: Node.js 24、pnpm、Google AI の API キー、MongoDB Atlas の接続文字列。

```bash
pnpm install
cp .env.example .env.local   # 値を設定する
pnpm db:push                 # コレクションとインデックスを作成
pnpm dev                     # http://localhost:3000
```

### 環境変数

`.env.local` に設定する（コミット禁止）。

| 名前 | 内容 |
| --- | --- |
| `GOOGLE_API_KEY` | Google AI（Gemini）の API キー |
| `MONGODB_URI` | MongoDB Atlas の接続文字列 |

## コマンド

```bash
pnpm dev         # 開発サーバー
pnpm build       # 本番ビルド
pnpm lint        # Lint
pnpm typecheck   # 型チェック
pnpm test        # Vitest（LLM・DBはモック）
pnpm agent:try   # Agent の手動動作確認（実APIを呼ぶ）
pnpm load:test   # 同時接続の簡易負荷確認（実APIを呼ぶ）
pnpm db:push     # Prisma スキーマを DB に反映
```

`make help` で Makefile のコマンド一覧を表示できる。`make init`（初期化）、`make dev`（開発サーバー）、`make build`（ビルド）、`make check`（lint・型チェック・テスト）、`make image`（Cloud Build でイメージをビルド）、`make deploy`（イメージをビルドして Cloud Run にデプロイ）、`make url`（公開URL表示）。

## デプロイ（Google Cloud Run）

事前に `gcloud` のログインとプロジェクト設定、課金の有効化を済ませておく。

```bash
PROJECT=<プロジェクトID>
REGION=asia-northeast1
IMAGE=$REGION-docker.pkg.dev/$PROJECT/ai-chatbot/app:v1

# 1. API の有効化
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com --project $PROJECT

# 2. イメージ置き場の作成
gcloud artifacts repositories create ai-chatbot --repository-format=docker \
  --location=$REGION --project $PROJECT

# 3. シークレットの登録と、実行用サービスアカウントへの権限付与
for K in GOOGLE_API_KEY MONGODB_URI; do
  gcloud secrets create $K --replication-policy=automatic --project $PROJECT
  printf %s "<値>" | gcloud secrets versions add $K --data-file=- --project $PROJECT
  gcloud secrets add-iam-policy-binding $K --project $PROJECT \
    --member=serviceAccount:<プロジェクト番号>-compute@developer.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
done

# 4. ビルドとデプロイ
gcloud builds submit --tag $IMAGE --project $PROJECT .
gcloud run deploy ai-chatbot --image $IMAGE --region $REGION --project $PROJECT \
  --allow-unauthenticated --port 8080 --timeout 300 --max-instances 1 \
  --concurrency 40 --memory 512Mi \
  --set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest,MONGODB_URI=MONGODB_URI:latest
```

注意点:

- API を有効化した直後は権限エラーが出ることがある。少し待って再実行する。
- Cloud Run の送信元IPは固定でないため、Atlas のネットワークアクセスは `0.0.0.0/0` を許可している。接続文字列のパスワードを強く保つこと。
- ローカルで `docker run --env-file` を使う場合、引用符は外されないため、引用符付きの `.env.local` をそのまま渡すと値が壊れる。
