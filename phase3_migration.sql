-- Migration: Phase 3 additions
-- Run this in your Supabase SQL Editor

-- Add deployed_at to deals (tracks when the deal was officially dispatched to operations)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ;

-- Add follow_up_draft to deals (AI-generated follow-up email draft for stale proposals)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_draft TEXT;

-- Index for the playbook query (stale proposals in stage 4 without follow-up)
CREATE INDEX IF NOT EXISTS idx_deals_stage_playbook 
ON deals (stage, stage_changed_at, proposal_status) 
WHERE stage = 4;
