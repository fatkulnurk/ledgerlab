# Deploying LedgerLab on AWS

Target shape: **ECS Fargate** for the two APIs, **S3 + CloudFront** for the
dashboard, **RDS for PostgreSQL** for data, secrets in **SSM Parameter Store**.

## 1. Database (RDS PostgreSQL)

```bash
aws rds create-db-instance \
  --db-instance-identifier ledgerlab \
  --engine postgres --engine-version 16.4 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-encrypted \
  --master-username ledgerlab \
  --manage-master-user-password \
  --backup-retention-period 7 --no-publicly-accessible
```

Use a least-privilege app user (not the master) and store the connection string:

```bash
aws ssm put-parameter --name /ledgerlab/DATABASE_URL --type SecureString --value "postgres://..."
```

## 2. Images (ECR)

```bash
aws ecr create-repository --repository-name ledgerlab/ledger-api
aws ecr create-repository --repository-name ledgerlab/reporting-api
aws ecr get-login-password | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

docker build -f deployment/Dockerfile.ledger-api     -t "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ledgerlab/ledger-api:latest" .
docker build -f deployment/Dockerfile.reporting-api  -t "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ledgerlab/reporting-api:latest" .
docker push "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ledgerlab/ledger-api:latest"
docker push "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ledgerlab/reporting-api:latest"
```

## 3. Services (ECS Fargate)

- Register a task definition per API using `deployment/aws/task-definition.json`
  as the template (2 tasks, 0.25 vCPU / 0.5 GB is enough for the demo).
- Put both behind an **Application Load Balancer**: `/api/*` and `/health` to
  `ledger-api`; `/reports/*` to `reporting-api` (or one ALB per service).
- Configure the target group health check at `/health`.
- Run migrations as a one-off ECS task: `pnpm --filter @ledgerlab/db migrate:sql`.
- Set `LEDGER_API_URL` on the reporting service to the ledger service's
  Cloud Map / service-connect DNS name.

## 4. Dashboard (S3 + CloudFront)

```bash
pnpm --filter @ledgerlab/web build
aws s3 sync apps/web/dist "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*"
```

Add a CloudFront Function for SPA fallback (`/*` -> `/index.html`) and a
response-headers policy with HSTS.

## 5. Production-scale / security notes

- Tasks are stateless: scale with `aws ecs update-service --desired-count N`.
- RDS in private subnets only; security group accepts traffic from the tasks only.
- Secrets via SSM/Secrets Manager, injected as task `secrets` (never in env plaintext).
- Enable ALB access logs and CloudWatch alarms on 5xx and latency.
- Set `CORS_ORIGINS` to the CloudFront domain; set `INTERNAL_API_TOKEN`.

See `deployment/cloudflare/README.md` to put Cloudflare in front of CloudFront/ALB.
