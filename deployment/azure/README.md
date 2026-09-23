# Deploying LedgerLab on Azure

Target shape: **Azure Container Apps** for the APIs, **Azure Database for
PostgreSQL Flexible Server**, dashboard on **Azure Static Web Apps**, secrets in
**Key Vault**.

## 1. Database (Flexible Server)

```bash
az postgres flexible-server create \
  --name ledgerlab-db --resource-group ledgerlab-rg \
  --location southeastasia --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --admin-user ledgeradmin --admin-password "$(openssl rand -base64 24)" \
  --public-access None

az postgres flexible-server db create -g ledgerlab-rg -s ledgerlab-db -d ledgerlab
az postgres flexible-server firewall-rule create -g ledgerlab-rg -s ledgerlab-db \
  --name allow-container-apps --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
```

## 2. Registry and secrets

```bash
az acr create -g ledgerlab-rg -n ledgerlabacr --sku Basic
az acr build -r ledgerlabacr -t ledger-api:latest     -f deployment/Dockerfile.ledger-api .
az acr build -r ledgerlabacr -t reporting-api:latest  -f deployment/Dockerfile.reporting-api .

az keyvault create -g ledgerlab-rg -n ledgerlab-kv
az keyvault secret set --vault-name ledgerlab-kv -n database-url --value "postgres://..."
az keyvault secret set --vault-name ledgerlab-kv -n internal-api-token --value "$(openssl rand -hex 32)"
```

## 3. Container Apps

```bash
az containerapp env create -g ledgerlab-rg -n ledgerlab-env -l southeastasia
az containerapp create -g ledgerlab-rg -n ledger-api --environment ledgerlab-env \
  --image ledgerlabacr.azurecr.io/ledger-api:latest \
  --target-port 4001 --ingress external \
  --min-replicas 1 --max-replicas 10 \
  --secrets database-url=keyvaultref:https://ledgerlab-kv.vault.azure.net/secrets/database-url,identityref:system \
  --env-vars LEDGER_API_PORT=4001 DATABASE_URL=secretref:database-url
```

Repeat for `reporting-api` (target port 4002) with `LEDGER_API_URL` pointing at
the ledger app's FQDN. See `deployment/azure/containerapp.yaml` for the
declarative form (`az containerapp update --yaml`).

## 4. Dashboard (Static Web App)

```bash
az staticwebapp create -g ledgerlab-rg -n ledgerlab-web \
  --source https://github.com/ORG/REPO --branch main \
  --app-location apps/web --output-location dist --login-with-github
```

Set `VITE_LEDGER_API_URL` / `VITE_REPORTING_API_URL` as Static Web App
configuration values.

## 5. Production-scale / security notes

- Container Apps scale on HTTP concurrency; keep the ledger service warm with
  `--min-replicas 1`.
- Private endpoint for PostgreSQL; no public access.
- Key Vault references via managed identity (no connection strings in env).
- Restrict `CORS_ORIGINS` and set `INTERNAL_API_TOKEN`.
- Front the Container Apps with Azure Front Door **or** Cloudflare
  (`deployment/cloudflare/README.md`) for WAF + rate limiting + custom domain.
