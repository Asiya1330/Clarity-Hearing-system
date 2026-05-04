-- Migration: add report_footer to clinics
--
-- Stores an optional text block printed in the footer of every OViz report
-- for this clinic (e.g. address, phone, disclaimer).

alter table public.clinics
  add column if not exists report_footer text;
