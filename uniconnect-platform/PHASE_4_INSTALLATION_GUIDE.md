# UniConnect Phase 4 - Events And Campus Engagement

## What This Adds

- Event RSVP
- Free ticket generation
- Ticket code support
- QR-check-in-ready architecture
- Manual and self check-in
- Event announcements
- Event feedback and ratings
- Event analytics counters
- Engagement panel UI

## Applied Locally

The Phase 4 patch has been merged into the existing events route.

## Supabase SQL

Run this file in Supabase SQL Editor after the previous migrations:

```txt
supabase/migrations/004_events_campus_engagement.sql
```

## Recommended Next Improvements

- Real QR code generation using `ticket_code`
- QR scanner page for organizers
- Paid ticket integration with Paystack, Hubtel, or MTN MoMo
- Event poster upload
- Event organizer roles
- Public event landing pages
- Event comments or discussions
- Attendance certificate generation
