/**
 * Supabase-backed store for a residence's availability.
 *
 * public.availability (migration 0003, extended by 0025) is keyed
 * unique(community_id, care_level) — one row per care level, not one row
 * per free-form "unit". The client UI lets staff type an arbitrary
 * careLevel per unit, so two units saved under the same care level collapse
 * into a single row (last write wins) — a real limitation of the current
 * schema, not something this store papers over.
 *
 * RLS (availability_select / availability_write, migration 0006, using
 * has_community_permission() as fixed by 0025) is defence in depth; the
 * server-side permission check in the API route is the primary gate.
 */
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityStatus, AvailabilityUnit } from "@/lib/community-portal";

type Row = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function rowToUnit(row: Row): AvailabilityUnit {
  return {
    id: str(row.id),
    roomType: str(row.room_type),
    count: num(row.available_rooms, 0),
    availableDate: str(row.available_date),
    price: typeof row.price === "number" ? row.price : null,
    careLevel: str(row.care_level),
    status: (row.status === "confirmed" ? "confirmed" : "estimated") as AvailabilityStatus,
    waitlistCount: num(row.waitlist, 0),
  };
}

const SELECT_COLUMNS = "id, care_level, available_rooms, waitlist, room_type, available_date, price, status";

export async function listAvailability(siteId: string): Promise<AvailabilityUnit[]> {
  const client = await createClient();
  const { data } = await client
    .from("availability")
    .select(SELECT_COLUMNS)
    .eq("community_id", siteId)
    .order("care_level", { ascending: true });
  return (data ?? []).map((row) => rowToUnit(row as Row));
}

export async function upsertAvailability(
  siteId: string,
  unit: AvailabilityUnit,
): Promise<{ ok: true; unit: AvailabilityUnit } | { ok: false; error: string }> {
  const client = await createClient();
  const { data, error } = await client
    .from("availability")
    .upsert(
      {
        community_id: siteId,
        care_level: unit.careLevel,
        available_rooms: unit.count,
        waitlist: unit.waitlistCount,
        room_type: unit.roomType || null,
        available_date: unit.availableDate || null,
        price: unit.price,
        status: unit.status,
      },
      { onConflict: "community_id,care_level" },
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to save availability." };
  }
  return { ok: true, unit: rowToUnit(data as Row) };
}

export async function removeAvailability(
  siteId: string,
  unitId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await createClient();
  const { error, count } = await client
    .from("availability")
    .delete({ count: "exact" })
    .eq("id", unitId)
    .eq("community_id", siteId);

  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Availability unit not found." };
  return { ok: true };
}
