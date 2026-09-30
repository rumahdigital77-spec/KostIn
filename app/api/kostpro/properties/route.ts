import { NextResponse } from 'next/server';

export async function GET() {
  const source = process.env.KOSTPRO_READ_API_URL;
  if (!source) return NextResponse.json({ source: 'demo', properties: [] });
  try {
    const response = await fetch(source, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' }, { status: 502 });
    const data = await response.json();
    return NextResponse.json({ source: 'kostpro', properties: Array.isArray(data) ? data : data.properties ?? [] });
  } catch {
    return NextResponse.json({ source: 'kostpro', properties: [], error: 'KOSTPRO read endpoint unavailable' }, { status: 502 });
  }
}
