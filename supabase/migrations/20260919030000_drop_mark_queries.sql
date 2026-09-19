-- The staff <-> SV/AS question thread is gone. Their ruling: staff ask their
-- supervisor on WhatsApp, as they already do, and a second inbox in the app
-- was one more thing to check for a conversation that never needed a
-- database row. Dropping the table takes its policies, its sequence and its
-- Realtime publication entry with it.

DROP TABLE mark_queries;
