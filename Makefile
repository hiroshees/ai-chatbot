# 使い方: make help
PROJECT ?= ai-chatbot-511405
REGION  ?= asia-northeast1
SERVICE ?= ai-chatbot
REPO    ?= ai-chatbot
# タグは既定でコミットSHA。未コミットの変更があるときは日時を付けて区別する
TAG     ?= $(shell git rev-parse --short HEAD)$(shell git diff --quiet HEAD || date +-%Y%m%d%H%M%S)
IMAGE   ?= $(REGION)-docker.pkg.dev/$(PROJECT)/$(REPO)/app:$(TAG)

.DEFAULT_GOAL := help
.PHONY: help init dev build check image deploy url

help: ## コマンド一覧を表示
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

init: ## 初期化（依存インストール、.env.local の雛形作成、DBのコレクション/インデックス作成）
	pnpm install
	@test -f .env.local || { cp .env.example .env.local; echo ".env.local を作成した。値を設定してから make init を再実行すること"; exit 1; }
	pnpm db:push

dev: ## 開発サーバーを起動（http://localhost:3000）
	pnpm dev

build: ## 本番ビルド
	pnpm build

check: ## lint・型チェック・テスト
	pnpm lint
	pnpm typecheck
	pnpm test

image: ## Cloud Build でイメージをビルドして Artifact Registry に登録
	gcloud builds submit --tag $(IMAGE) --project $(PROJECT) .

deploy: image ## イメージをビルドして Cloud Run にデプロイ（シークレットは Secret Manager から注入）
	gcloud run deploy $(SERVICE) --image $(IMAGE) --region $(REGION) --project $(PROJECT) \
		--allow-unauthenticated --port 8080 --timeout 300 --max-instances 1 \
		--concurrency 40 --memory 512Mi \
		--set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest,MONGODB_URI=MONGODB_URI:latest

url: ## デプロイ済みサービスのURLを表示
	@gcloud run services describe $(SERVICE) --region $(REGION) --project $(PROJECT) --format='value(status.url)'
