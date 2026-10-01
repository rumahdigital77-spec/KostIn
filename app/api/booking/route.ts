import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// IMPORTANT: KostIn has its own Supabase project. Booking writes must NEVER
// fall back to KostIn's NEXT_PUBLIC_SUPABASE_* variables.
// The master/source of truth for inventory and bookings is KOSTPRO.
const KOSTPRO_URL = 'https://vynsxajbqkgkudfbraog.supabase.co';
const KOSTPRO_KEY = 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

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
    const roomPrice = Number(body.roomPrice || 0); // legacy client field; never used as master price
    const paymentMethod = String(body.paymentMethod || 'TRANSFER_BANK').trim();

    if (
      !propertyId ||
      !roomId ||
      !name ||
      !phone ||
      !checkIn ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 120 ||
      !paymentMethod
    ) {
      return NextResponse.json(
        { success: false, error: 'Data booking belum lengkap.' },
        { status: 400 }
      );
    }

    const kms = createClient(KOSTPRO_URL, KOSTPRO_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await kms.rpc('create_kostin_booking_in_kostpro_v2', {
      p_property_id: propertyId,
      p_room_id: roomId,
      p_guest_name: name,
      p_guest_phone: phone,
      p_check_in: checkIn,
      p_duration_months: duration,
      p_payment_method: paymentMethod
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

    const bookingId = data && typeof data === 'object'
      ? String((data as Record<string, unknown>).booking_id || (data as Record<string, unknown>).id || '')
      : '';
    if (!bookingId) {
      console.error('[KostIn] booking RPC returned no booking id');
      return NextResponse.json(
        { success: false, error: 'KOSTPRO tidak mengembalikan ID booking.' },
        { status: 502 }
      );
    }

    console.log('[KostIn] booking bridge success', { bookingId, propertyId, roomId });
    return NextResponse.json(
      { success: true, booking: data, bookingId },
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
