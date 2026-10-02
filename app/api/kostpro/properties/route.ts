import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KOSTPRO_SUPABASE_URL = 'https://vynsxajbqkgkudfbraog.supabase.co';
const KOSTPRO_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export async function GET() {
  try {
    const client = createClient(KOSTPRO_SUPABASE_URL, KOSTPRO_SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await client.rpc('get_kostin_public_inventory_v3');
    if (error) {
      console.error('[KostIn] KOSTPRO inventory RPC failed:', error);
      return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO inventory feed failed' }, { status: 502 });
    }

    const rows = Array.isArray(data) ? data : typeof data === 'string' ? JSON.parse(data) : [];
    const grouped = new Map<string, any>();

    for (const row of rows) {
      const propertyId = String(row?.source_property_id || '');
      const roomId = String(row?.source_room_id || '');
      if (!propertyId || !roomId) continue;
      const status = String(row?.status || '').toUpperCase();
      if (!['AVAILABLE', 'TERSEDIA', 'READY'].includes(status)) continue;

      if (!grouped.has(propertyId)) {
        grouped.set(propertyId, {
          source_property_id: propertyId,
          name: String(row?.property_name || 'Property'),
          city: null,
          address: row?.address ?? null,
          cover_url: null,
          facilities: [],
          rooms: []
        });
      }

      grouped.get(propertyId).rooms.push({
        source_room_id: roomId,
        name: String(row?.name || roomId),
        room_type: row?.room_type ?? null,
        price_monthly: Number(row?.price_monthly || 0),
        status: 'AVAILABLE'
      });
    }

    const properties = [...grouped.values()].filter(p => p.rooms.length > 0);
    const totalRooms = properties.reduce((n, p) => n + p.rooms.length, 0);

    return NextResponse.json(
      { source: 'kostpro', read_only: true, properties, total_available_rooms: totalRooms },
      { headers: { 'Cache-Control': 'no-store, max-age=0, s-maxage=0' } }
    );
  } catch (error) {
    console.error('[KostIn] KOSTPRO inventory unavailable:', error);
    return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO inventory unavailable' }, { status: 502 });
  }
}
