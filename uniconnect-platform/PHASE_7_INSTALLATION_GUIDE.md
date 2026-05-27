# UniConnect Phase 7: Enterprise & National Expansion

This phase adds the enterprise layer for scaling UniConnect across schools and sponsors.

## Files Added or Updated

- `src/pages/enterprise/EnterpriseDashboard.jsx`
- `src/services/enterpriseService.js`
- `src/App.jsx`
- `src/layouts/AppLayout.jsx`
- `supabase/migrations/010_enterprise_national_expansion.sql`

## Database Setup

Run this migration in Supabase SQL Editor after migrations `001` through `009`:

```sql
-- supabase/migrations/010_enterprise_national_expansion.sql
```

Then run the commercial completion migration:

```sql
-- supabase/migrations/011_enterprise_commercial_completion.sql
```

## Feature Checklist

- Subscription plans
- University subscriptions
- White-label portal settings
- Campus ambassadors
- Referrals
- Sponsor campaigns
- API clients
- Platform metrics
- Enterprise dashboard route
- PWA manifest and service worker
- National student ID verification records
- Subscription payment intents
- Ad placements, creatives, impressions, and clicks
- Financial settlement records
