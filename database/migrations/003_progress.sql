-- ---------------------------------------------------------------------------
-- What a run is doing, while it does it
--
-- The analysis engine reports each stage as it starts and finishes and counts
-- charts as they render. The web service appends those reports here as they
-- arrive, so the page can show where a run is, and a failed run keeps the
-- stage it stopped in beside the reason.
-- ---------------------------------------------------------------------------
ALTER TABLE analysis_requests
    ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '[]'::jsonb;
