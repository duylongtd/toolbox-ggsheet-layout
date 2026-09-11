-- ---------------------------------------------------------------------------
-- Proposed changes awaiting approval
--
-- A request typed in words is planned before it is applied. The plan is held
-- here until the person accepts it, so nothing the model proposes reaches the
-- report without a decision, and a page refresh does not lose the proposal.
-- ---------------------------------------------------------------------------
ALTER TABLE analysis_requests
    ADD COLUMN IF NOT EXISTS pending_plan jsonb;
