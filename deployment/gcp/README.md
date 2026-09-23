# Deploying LedgerLab on Google Cloud

Target shape: **Cloud Run** for the APIs, **Cloud SQL for PostgreSQL**, dashboard
as a Cloud Run static container or **Firebase Hosting**, secrets in **Secret Manager**.

## 1. Database (Cloud SQL)

```bash
gcloud sql instances create ledgerlab-db \
  --database-version=POSTGRES_16 --tier=db-f1-micro \
  --region=asia-southeast1 --storage-auto-increase

gcloud sql databases create ledgerlab --instance=ledgerlab-db
gcloud sql users create ledgerlab --instance=ledgerlab-db --password="$(openssl rand -base64 24)"
```

## 2. Secrets

```bash
printf '%s' "postgres://ledgerlab:PASSWORD@/ledgerlab?host=/cloudsql/PROJECT:REGION:ledgerlab-db" \
  | gcloud secrets create DATABASE_URL --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create INTERNAL_API_TOKEN --data-file=-
```

## 3. Build and deploy

```bash
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/PROJECT/ledgerlab/ledger-api \
  --file deployment/Dockerfile.ledger-api .
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/PROJECT/ledgerlab/reporting-api \
  --file deployment/Dockerfile.reporting-api .

gcloud run deploy ledger-api \
  --image asia-southeast1-docker.pkg.dev/PROJECT/ledgerlab/ledger-api \
  --region asia-southeast1 --allow-unauthenticated \
  --add-cloudsql-instances PROJECT:REGION:ledgerlab-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,INTERNAL_API_TOKEN=INTERNAL_API_TOKEN:latest \
  --set-env-vars CORS_ORIGINS=https://ledgerlab.example.com \
  --min-instances 1 --max-instances 10 --cpu 1 --memory 512Mi --port 4001

gcloud run deploy reporting-api \
  --image asia-southeast1-docker.pkg.dev/PROJECT/ledgerlab/reporting-api \
  --region asia-southeast1 --allow-unauthenticated \
  --set-secrets INTERNAL_API_TOKEN=INTERNAL_API_TOKEN:latest \
  --set-env-vars LEDGER_API_URL=https://ledger-api-HASH-REGION.a.run.app,CORS_ORIGINS=https://ledgerlab.example.com \
  --port 4002
```

Run migrations once:

```bash
gcloud run jobs create ledger-migrate --image ... --command pnpm \
  --args --filter,@ledgerlab/db,migrate:sql --set-secrets DATABASE_URL=DATABASE_URL:latest
gcloud run jobs execute ledger-migrate --wait
```

## 4. Dashboard

Build with the deployed API URLs and host on Firebase Hosting or a Cloud Run
nginx container (same `Dockerfile.web`):

```bash
pnpm --filter @ledgerlab/web build   # with VITE_* pointing at Cloud Run URLs
firebase deploy --only hosting
```

## 5. Production-scale / security notes

- `min-instances 1` avoids cold starts on the ledger service; scale with `--max-instances`.
- Cloud SQL private IP + the Cloud Run connector; never expose the DB publicly.
- Secrets from Secret Manager; the service account gets `secretAccessor` only.
- Set `CORS_ORIGINS` and `INTERNAL_API_TOKEN`; keep `/api/internal/*` private.
- Cloud Armor in front of the load balancer for WAF + rate limiting, or use
  Cloudflare (see `deployment/cloudflare/README.md`).

See `deployment/gcp/service.yaml` for a declarative Cloud Run spec.
