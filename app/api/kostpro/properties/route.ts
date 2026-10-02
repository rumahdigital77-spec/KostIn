import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KOSTPRO_SUPABASE_URL = 'https://vynsxajbqkgkudfbraog.supabase.co';
const KOSTPRO_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export async function GET() {
  try {
    const client = createClient(
      KOSTPRO_SUPABASE_URL,
      KOSTPRO_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { data, error } = await client.rpc('get_kostin_public_properties_v2');

    if (error) {
      console.error('[KostIn] KOSTPRO public feed RPC failed:', error);
      return NextResponse.json(
        {
          source: 'kostpro',
          properties: [],
          error: 'KOSTPRO public feed failed'
        },
        { status: 502 }
      );
    }

    const rawProperties = Array.isArray(data)
      ? data
      : typeof data === 'string'
        ? JSON.parse(data)
        : data && Array.isArray(data.properties)
          ? data.properties
          : [];

    const properties = Array.isArray(rawProperties)
      ? rawProperties
          .map((property: any) => ({
            source_property_id: String(property?.source_property_id || ''),
            name: String(property?.name || 'Property'),
            city: property?.city ?? null,
            address: property?.address ?? null,
            cover_url: property?.cover_url ?? null,
            facilities: Array.isArray(property?.facilities)
              ? property.facilities
              : [],
            rooms: Array.isArray(property?.rooms)
              ? property.rooms
                  .filter(
                    (room: any) =>
                      ['AVAILABLE','TERSEDIA','READY'].includes(String(room?.status || '').toUpperCase())
                  )
                  .map((room: any) => ({
                    ...room,
                    source_room_id: String(room?.source_room_id || room?.id || ''),
                    name: String(room?.name || room?.source_room_id || 'Kamar')
                  }))
              : []
          }))
          .filter(
            (property: any) =>
              property.source_property_id && property.rooms.length > 0
          )
      : [];

    return NextResponse.json(
      {
        source: 'kostpro',
        read_only: true,
        properties
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, s-maxage=0'
        }
      }
    );
  } catch (error) {
    console.error('[KostIn] KOSTPRO public feed unavailable:', error);
    return NextResponse.json(
      {
        source: 'kostpro',
        properties: [],
        error: 'KOSTPRO public feed unavailable'
      },
      { status: 502 }
    );
  }
}
