import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const source = process.env.KOSTPRO_READ_API_URL;
  if (!source) return NextResponse.json({ source: 'demo', properties: [] });
  try {
    const response = await fetch(source, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' }, { status: 502 });
    const data = await response.json();
    const properties = Array.isArray(data) ? data : data.properties ?? [];
    for (const property of properties) {
      const sourcePropertyId = String(property.source_property_id ?? property.id ?? '');
      if (!sourcePropertyId) continue;
      const { data: localProperty } = await admin.from('properties').upsert({
        source_property_id: sourcePropertyId,
        name: property.name ?? 'Property',
        city: property.city ?? null,
        address: property.address ?? null,
        cover_url: property.cover_url ?? null,
        facilities: property.facilities ?? []
      }, { onConflict: 'source_property_id' }).select('id').single();
      if (!localProperty) continue;
      const rooms = Array.isArray(property.rooms) ? property.rooms : [];
      if (rooms.length) {
        await admin.from('rooms').upsert(rooms.map((room:any) => ({
          property_id: localProperty.id,
          source_room_id: String(room.source_room_id ?? room.id ?? ''),
          name: room.name ?? 'Kamar',
          room_type: room.room_type ?? room.type ?? null,
          price_monthly: Number(room.price_monthly ?? room.price ?? 0),
          status: room.status ?? 'AVAILABLE'
        })).filter((room:any)=>room.source_room_id), { onConflict: 'source_room_id' });
      }
    }
    return NextResponse.json({ source: 'kostpro', properties });
  } catch {
    return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' }, { status: 502 });
  }
}
