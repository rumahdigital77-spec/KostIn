import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KOSTPRO_READ_API_URL =
  process.env.KOSTPRO_READ_API_URL ||
  'https://kostpro.vercel.app/api/kostin/properties';

export async function GET() {
  try {
    const upstream = await fetch(`${KOSTPRO_READ_API_URL}?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok || !payload || !Array.isArray(payload.properties)) {
      return NextResponse.json(
        {
          source: 'kostpro',
          properties: [],
          error: 'KOSTPRO read endpoint unavailable'
        },
        { status: 502 }
      );
    }

    const properties = payload.properties
      .map((property: any) => ({
        ...property,
        rooms: Array.isArray(property?.rooms)
          ? property.rooms.filter(
              (room: any) =>
                String(room?.status || '').toUpperCase() === 'AVAILABLE'
            )
          : []
      }))
      .filter((property: any) => property.rooms.length > 0);

    return NextResponse.json(
      {
        source: 'kostpro',
        read_only: true,
        properties
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        source: 'kostpro',
        properties: [],
        error: 'KOSTPRO read endpoint unavailable'
      },
      { status: 502 }
    );
  }
}
