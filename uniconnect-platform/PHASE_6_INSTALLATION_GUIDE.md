# UniConnect Phase 6: Career & AI Ecosystem

This phase adds career identity, internships, portfolios, resume profiles, skills, and saved AI study sessions.

## Files Added or Updated

- `src/pages/career/CareerAI.jsx`
- `src/services/careerService.js`
- `src/App.jsx`
- `src/layouts/AppLayout.jsx`
- `supabase/migrations/008_career_ai_ecosystem.sql`

## Database Setup

Run this migration in Supabase SQL Editor after migrations `001` through `007`:

```sql
-- supabase/migrations/008_career_ai_ecosystem.sql
```

Then run the completion migration:

```sql
-- supabase/migrations/009_career_ai_completion.sql
```

## Feature Checklist

- Internship listings
- Student applications
- Admin opportunity posting
- Portfolio builder
- Resume profile builder
- Skills profile
- AI study session generator and history
- University-scoped career data
- Recruiter profiles and company workspace
- Recruiter application review
- AI note summaries, quizzes, flashcards, mock interviews, and resume optimization scaffolding
- Skill endorsements/evidence
- Campus career reputation and ranking
