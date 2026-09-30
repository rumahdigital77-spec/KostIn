import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const DEFAULT_KOSTPRO_READ_API = 'https://kostpro.vercel.app/api/kostin/properties';

export async function GET() {
  const source = process.env.KOSTPRO_READ_API_URL || DEFAULT_KOSTPRO_READ_API;
  try {
    const response = await fetch(source, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' }, { status: 502 });
    const data = await response.json();
    const properties = Array.isArray(data) ? data : (Array.isArray(data.properties) ? data.properties : []);

    for (const property of properties) {
      const sourcePropertyId = String(property.source_property_id ?? property.id ?? '');
      if (!sourcePropertyId) continue;
      const { data: localProperty, error: propertyError } = await admin.from('properties').upsert({
        source_property_id: sourcePropertyId,
        name: property.name ?? 'Property',
        city: property.city ?? null,
        address: property.address ?? null,
        cover_url: property.cover_url ?? null,
        facilities: property.facilities ?? []
      }, { onConflict: 'source_property_id' }).select('id').single();
      if (propertyError || !localProperty) continue;

      const rooms = Array.isArray(property.rooms) ? property.rooms : [];
      if (rooms.length) {
        await admin.from('rooms').upsert(
          rooms.map((room: any) => ({
            property_id: localProperty.id,
            source_room_id: String(room.source_room_id ?? room.id ?? ''),
            name: room.name ?? 'Kamar',
            room_type: room.room_type ?? room.type ?? null,
            price_monthly: Number(room.price_monthly ?? room.price ?? 0),
            status: String(room.status ?? 'AVAILABLE').toUpperCase()
          })).filter((room: any) => room.source_room_id),
          { onConflict: 'source_room_id' }
        );
      }
    }

    return NextResponse.json({ source: 'kostpro', read_only: true, properties }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' }, { status: 502 });
  }
}
