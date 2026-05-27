# UniConnect Phase 5: Elections & Governance

This patch adds the governance layer for campus elections.

## Files Added or Updated

- `src/pages/elections/Elections.jsx`
- `src/services/electionService.js`
- `supabase/migrations/006_elections_governance.sql`

## Database Setup

Run this migration in Supabase SQL Editor after migrations `001` through `005`:

```sql
-- supabase/migrations/006_elections_governance.sql
```

The migration extends the existing elections tables and adds:

- Election positions
- Verified voter registry
- Candidate manifestos
- Debate sessions
- Election petitions
- Audit logs
- RLS policies for university isolation

## Feature Checklist

- Admins can create, open, close, and draft elections.
- Admins can add election positions.
- Students can register as candidates.
- Students can vote once per position.
- Results are counted from votes.
- Students can submit election petitions.
- Data stays scoped by `university_id`.
