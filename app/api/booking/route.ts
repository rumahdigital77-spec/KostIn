import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KOSTPRO_URL =
  process.env.KOSTPRO_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://vynsxajbqkgkudfbraog.supabase.co';

const KOSTPRO_KEY =
  process.env.KOSTPRO_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export async function POST(request: Request) {
  try {
    if (!KOSTPRO_URL || !KOSTPRO_KEY) {
      console.error('[KostIn] Missing KOSTPRO Supabase environment variables');
      return NextResponse.json(
        { success: false, error: 'Konfigurasi koneksi KOSTPRO belum tersedia di server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const propertyId = String(body.propertyId || '').trim();
    const roomId = String(body.roomId || '').trim();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const checkIn = String(body.checkIn || '').trim();
    const duration = Number(body.duration || 0);

    if (
      !propertyId ||
      !roomId ||
      !name ||
      !phone ||
      !checkIn ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 120
    ) {
      return NextResponse.json(
        { success: false, error: 'Data booking belum lengkap.' },
        { status: 400 }
      );
    }

    const kms = createClient(KOSTPRO_URL, KOSTPRO_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await kms.rpc('create_kostin_booking_in_kostpro', {
      p_property_id: propertyId,
      p_room_id: roomId,
      p_guest_name: name,
      p_guest_phone: phone,
      p_check_in: checkIn,
      p_duration_months: duration
    });

    if (error) {
      console.error('[KostIn] booking RPC failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Booking ditolak oleh KOSTPRO.'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true, booking: data },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      }
    );
  } catch (error) {
    console.error('[KostIn] booking server error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server booking KostIn tidak dapat memproses permintaan.'
      },
      { status: 500 }
    );
  }
}
