# Engineering Platform

## Local dev: bringing up dependencies

```bash
docker compose up -d postgres    # primary database
docker compose up -d lgtm        # Grafana + Prometheus + Loki + Tempo (for the Grafana integration)
```

`lgtm` runs the all-in-one `grafana/otel-lgtm` image. Grafana listens on
`http://localhost:3000` (admin/admin). To wire it into the platform:

1. In Grafana, create an admin service account and a token.
2. Visit `/integrations` in the platform UI, click Grafana, paste the base URL
   and token, choose the datasources to use.
3. Set up an Alertmanager webhook contact point in Grafana using the
   one-time webhook URL + Bearer secret the dialog hands you. The secret is
   shown exactly once.
