-- Migration: recommendations_restructure
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504203909). Already
-- applied in production; committed here so the repo mirrors the real history.
--
-- Add custom_note, updated_by, and composite index to consult_recommendations.
-- Migrate legacy group IDs to v2.0 IDs.
-- Item IDs changed completely in v2; clear selected_item_ids to avoid orphaned references.

ALTER TABLE public.consult_recommendations
  ADD COLUMN IF NOT EXISTS custom_note text CHECK (char_length(custom_note) <= 1000),
  ADD COLUMN IF NOT EXISTS updated_by uuid references auth.users(id);

-- Composite index for clinic-scoped searches ordered by recency
CREATE INDEX IF NOT EXISTS consult_recommendations_clinic_updated_idx
  ON public.consult_recommendations(clinic_id, updated_at DESC);

-- Migrate legacy v1.0 group IDs to v2.0 group IDs in selected_group_ids.
-- Groups that have no direct mapping (communication-basics) are removed.
UPDATE public.consult_recommendations
SET
  selected_group_ids = (
    SELECT COALESCE(
      ARRAY_AGG(
        CASE grp_id
          WHEN 'accepted-plan'         THEN 'accepted-getting-started'
          WHEN 'still-thinking'        THEN 'thinking-decision-support'
          WHEN 'declined-today'        THEN 'declined-keep-door-open'
          WHEN 'followup-visit'        THEN 'follow-up-review-progress'
          WHEN 'phone-difficulty'      THEN 'phone-calls'
          WHEN 'ear-fit-photos'        THEN 'ear-fit-photos-care'
          WHEN 'safety-referral'       THEN 'safety-referral-caution'
          WHEN 'communication-basics'  THEN NULL  -- no direct v2 equivalent
          ELSE grp_id
        END
      ) FILTER (WHERE
        CASE grp_id
          WHEN 'accepted-plan'         THEN 'accepted-getting-started'
          WHEN 'still-thinking'        THEN 'thinking-decision-support'
          WHEN 'declined-today'        THEN 'declined-keep-door-open'
          WHEN 'followup-visit'        THEN 'follow-up-review-progress'
          WHEN 'phone-difficulty'      THEN 'phone-calls'
          WHEN 'ear-fit-photos'        THEN 'ear-fit-photos-care'
          WHEN 'safety-referral'       THEN 'safety-referral-caution'
          WHEN 'communication-basics'  THEN NULL
          ELSE grp_id
        END IS NOT NULL
      ),
      '{}'::text[]
    )
    FROM UNNEST(selected_group_ids) AS grp_id
  ),
  -- Item IDs changed completely; reset to empty so the UI defaults to all items selected per group.
  selected_item_ids = '{}'::jsonb,
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM UNNEST(selected_group_ids) AS grp_id
  WHERE grp_id IN (
    'accepted-plan', 'still-thinking', 'declined-today', 'followup-visit',
    'phone-difficulty', 'ear-fit-photos', 'safety-referral', 'communication-basics'
  )
);
