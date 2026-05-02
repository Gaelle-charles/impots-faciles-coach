# Scripts

## seed-coupons.ts

Crée 5 coupons de test, 3 utilisateurs et 5 redemptions dans la DB Supabase.

### Prérequis

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
```

> ⚠️ N'utilise jamais ce script sur la base de production sans précaution. Tous les coupons
> de seed sont préfixés par `TEST_SEED_` et tous les users par `seed.userN@impotsfacile.test`,
> ce qui permet le ciblage propre par `--reset`.

### Usage

```bash
# Seed
bunx tsx scripts/seed-coupons.ts

# Reset puis re-seed
bunx tsx scripts/seed-coupons.ts --reset

# Reset uniquement
bunx tsx scripts/seed-coupons.ts --reset --only-reset
```

### Données créées

| Code                         | % | Plans              | Particularité                |
| ---------------------------- | - | ------------------ | ---------------------------- |
| `TEST_SEED_WELCOME10`        | 10 | tous               | Parrain none                 |
| `TEST_SEED_INFLU25`          | 25 | expert, premium    | Parrain externe (influ.)     |
| `TEST_SEED_PARTENAIRE15`     | 15 | starter            | Parrain user (Alice)         |
| `TEST_SEED_EXPIRED50`        | 50 | premium            | Expiré (hier)                |
| `TEST_SEED_OFF`              | 20 | starter, expert    | Désactivé (active=false)     |

5 redemptions sont créées via `record_coupon_redemption` pour exercer les KPIs admin.
