import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type TraccarPosition = {
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number; // knots
  course: number;
  fixTime: string;
};

export const syncTraccarPositions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("No tenant");

    const { data: cfg } = await supabase
      .from("traccar_configs")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!cfg || !cfg.enabled) throw new Error("Traccar غير مُفعّل لهذه الشركة");
    if (!cfg.base_url) throw new Error("عنوان خادم Traccar مفقود");

    const baseUrl = cfg.base_url.replace(/\/+$/, "");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cfg.username) {
      const token = btoa(`${cfg.username}:${cfg.password ?? ""}`);
      headers.Authorization = `Basic ${token}`;
    }

    const res = await fetch(`${baseUrl}/api/positions`, { headers });
    if (!res.ok) throw new Error(`Traccar HTTP ${res.status}`);
    const positions = (await res.json()) as TraccarPosition[];

    const { data: devices } = await supabase
      .from("gps_devices")
      .select("id, traccar_device_id, vehicle_id")
      .eq("tenant_id", tenantId)
      .not("traccar_device_id", "is", null);

    const byTraccarId = new Map<string, { id: string; vehicle_id: string | null }>();
    (devices ?? []).forEach((d) => {
      if (d.traccar_device_id) byTraccarId.set(String(d.traccar_device_id), d);
    });

    let updated = 0;
    let inserted = 0;
    for (const p of positions) {
      const dev = byTraccarId.get(String(p.deviceId));
      if (!dev) continue;
      const speedKmh = Math.round(p.speed * 1.852 * 10) / 10;

      await supabase
        .from("gps_devices")
        .update({
          last_seen_at: p.fixTime,
          last_latitude: p.latitude,
          last_longitude: p.longitude,
          status: "active",
        })
        .eq("id", dev.id);
      updated++;

      if (dev.vehicle_id) {
        const { data: trip } = await supabase
          .from("trips")
          .select("id")
          .eq("vehicle_id", dev.vehicle_id)
          .in("status", ["planned", "in_progress", "started"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (trip) {
          const { error } = await supabase.from("trip_locations").insert({
            trip_id: trip.id,
            tenant_id: tenantId,
            latitude: p.latitude,
            longitude: p.longitude,
            speed_kmh: speedKmh,
            recorded_at: p.fixTime,
          });
          if (!error) inserted++;
        }
      }
    }

    await supabase
      .from("traccar_configs")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);

    return { updated, inserted, total: positions.length };
  });

export const testTraccarConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data as { base_url: string; username?: string; password?: string })
  .handler(async ({ data }) => {
    const baseUrl = data.base_url.replace(/\/+$/, "");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (data.username) {
      headers.Authorization = `Basic ${btoa(`${data.username}:${data.password ?? ""}`)}`;
    }
    const res = await fetch(`${baseUrl}/api/devices`, { headers });
    if (!res.ok) throw new Error(`فشل الاتصال (HTTP ${res.status})`);
    const devices = (await res.json()) as Array<{ id: number; name: string; uniqueId: string; status: string }>;
    return { count: devices.length, devices: devices.slice(0, 100) };
  });
