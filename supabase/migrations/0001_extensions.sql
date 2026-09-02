-- HavenApply 0001: extensions & shared utilities
-- Target: Supabase Postgres

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
-- PostGIS & vector may need to be enabled in Supabase dashboard if not available in local
create extension if not exists "postgis";
create extension if not exists "vector";

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Enums (shared across domains)
do $$ begin
  create type public.profile_status as enum ('active', 'invited', 'suspended', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform_role as enum ('super_admin', 'ops', 'support', 'moderator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.family_member_role as enum ('owner', 'editor', 'viewer', 'medical', 'financial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_status as enum ('draft', 'active', 'suspended', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.community_status as enum ('draft', 'pending_review', 'verified', 'suspended', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.community_team_role as enum ('org_admin', 'admissions_manager', 'admissions_staff', 'readonly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_role_kind as enum ('org_owner', 'billing_admin', 'crm_admin', 'analytics_viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum ('uploading', 'ready', 'quarantined', 'expired', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_category as enum ('id', 'insurance', 'medical', 'financial', 'legal', 'application', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum (
    'draft',
    'submitted',
    'received',
    'under_review',
    'more_info',
    'tour_requested',
    'assessment_requested',
    'waitlisted',
    'conditionally_approved',
    'approved',
    'offer_received',
    'declined',
    'withdrawn',
    'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tour_status as enum ('proposed', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outbox_status as enum ('pending', 'processing', 'sent', 'failed', 'dead');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_status as enum ('received', 'processed', 'failed', 'ignored');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.integration_status as enum ('disconnected', 'connecting', 'active', 'error', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_level as enum (
    'mostly_independent',
    'light_assisted',
    'assisted_living',
    'memory_care',
    'skilled_nursing'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_visibility as enum ('internal', 'support');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.team_member_status as enum ('invited', 'active', 'suspended', 'removed');
exception when duplicate_object then null; end $$;
