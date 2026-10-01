import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KMS_SUPABASE_URL = 'https://vynsxajbqkgkudfbraog.supabase.co';
const KMS_PUBLISHABLE_KEY = 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export async function GET() {
  try {
    const kms = createClient(KMS_SUPABASE_URL, KMS_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const direct = await kms
      .from('properties')
      .select('id,source_property_id,name,city,address,cover_url,facilities,rooms:rooms(id,source_room_id,name,room_type,price_monthly,status)')
      .order('name');

    if (!direct.error && Array.isArray(direct.data)) {
      const properties = direct.data
        .map((property: any) => ({
          ...property,
          rooms: Array.isArray(property?.rooms)
            ? property.rooms.filter((room: any) => String(room?.status || '').toUpperCase() === 'AVAILABLE')
            : []
        }))
        .filter((property: any) => property.rooms.length > 0);

      return NextResponse.json(
        { source: 'kostpro', read_only: true, properties },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const { data, error } = await kms.rpc('get_kostin_public_properties');
    if (error) {
      return NextResponse.json(
        { source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        source: 'kostpro',
        read_only: true,
        properties: Array.isArray(data)
          ? data
              .map((property: any) => ({
                ...property,
                rooms: Array.isArray(property?.rooms)
                  ? property.rooms.filter((room: any) => String(room?.status || '').toLowerCase() === 'available')
                  : []
              }))
              .filter((property: any) => property.rooms.length > 0)
          : []
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json(
      { source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' },
      { status: 502 }
    );
  }
}
