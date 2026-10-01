import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL =
  process.env.KOSTPRO_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://vynsxajbqkgkudfbraog.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.KOSTPRO_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error('[KostIn] Missing KOSTPRO Supabase environment variables');
      return NextResponse.json(
        {
          source: 'kostpro',
          properties: [],
          error: 'Konfigurasi koneksi KOSTPRO belum tersedia di server.'
        },
        { status: 500 }
      );
    }

    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await client.rpc('get_kostin_public_properties');

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

    const properties = Array.isArray(data)
      ? data
          .map((property: any) => ({
            ...property,
            rooms: Array.isArray(property?.rooms)
              ? property.rooms.filter(
                  (room: any) =>
                    String(room?.status || '').toUpperCase() === 'AVAILABLE'
                )
              : []
          }))
          .filter((property: any) => property.rooms.length > 0)
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
