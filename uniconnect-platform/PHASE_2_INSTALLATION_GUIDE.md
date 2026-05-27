# UniConnect Phase 2 - Realtime Communication

## What this patch adds

- Direct messaging
- Conversation list
- Start chat with students in the same university
- Realtime message subscription
- Online presence table
- RLS security policies for messages

## Applied locally

The patch has been merged into this project. The existing Phase 1 notifications service was preserved because this app already uses `recipient_id` and `read_at` notification columns.

## Supabase SQL

Run this file in Supabase SQL Editor after `001_init.sql`:

```txt
supabase/migrations/002_realtime_communication.sql
```

## Supabase Realtime Setup

In Supabase Dashboard, go to:

```txt
Database > Replication > supabase_realtime
```

Enable these tables:

- conversations
- conversation_members
- messages
- notifications
- user_presence

## Test

Create at least two student accounts in the same university.

1. Login as Student A.
2. Go to Messages.
3. Click New Chat.
4. Select Student B.
5. Send a message.
6. Login as Student B in another browser and check the chat.
