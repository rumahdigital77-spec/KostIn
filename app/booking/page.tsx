'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const KOSTPRO_URL = process.env.NEXT_PUBLIC_KOSTPRO_SUPABASE_URL || 'https://vynsxajbqkgkudfbraog.supabase.co';
const KOSTPRO_KEY = process.env.NEXT_PUBLIC_KOSTPRO_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';
const supabase = createClient(KOSTPRO_URL, KOSTPRO_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

export default function Booking() {
  const [propertyId,setPropertyId]=useState('');
  const [roomId,setRoomId]=useState('');
  const [price,setPrice]=useState(0);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    setPropertyId(p.get('propertyId')||'');
    setRoomId(p.get('roomId')||'');
    setPrice(Math.max(0, Number(p.get('price')||0)));
  },[]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const form=new FormData(e.currentTarget);

    try {
      const payload={
        propertyId,
        roomId,
        name:String(form.get('name')||'').trim(),
        phone:String(form.get('phone')||'').trim(),
        checkIn:String(form.get('checkIn')||'').trim(),
        duration:Number(form.get('duration')||1)
      };

      const { data, error } = await supabase.rpc('create_kostin_booking_in_kostpro', {
        p_property_id: payload.propertyId,
        p_room_id: payload.roomId,
        p_guest_name: payload.name,
        p_guest_phone: payload.phone,
        p_check_in: payload.checkIn,
        p_duration_months: payload.duration
      });

      if(error){
        const detail=error.message||'Booking ditolak oleh KOSTPRO.';
        setMessage(detail.includes('Kamar sudah tidak tersedia') ? 'Kamar sudah tidak tersedia. Silakan pilih kamar lain.' : detail.includes('Tanggal check-in') ? detail : detail.includes('Data booking') ? 'Mohon lengkapi semua data booking.' : 'Booking belum dapat dikirim ke KOSTPRO. Silakan coba lagi.');
        return;
      }
      if(!data?.success){
        setMessage('Booking belum berhasil dikirim ke KOSTPRO.');
        return;
      }
      setMessage('✓ Booking berhasil dikirim ke KOSTPRO. Status kamar sekarang RESERVED dan booking tercatat sebagai PENDING.');
      e.currentTarget.reset();
    } catch (error) {
      setMessage('Koneksi ke KOSTPRO terputus atau permintaan terlalu lama. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="bookingPage">
    <a href="/" className="back">← Kembali</a>
    <div className="bookingCard">
      <span className="eyebrow">BOOKING KAMAR</span>
      <h1>Amankan kamar pilihanmu.</h1>
      <p>Data booking dikirim langsung ke master KOSTPRO. Data property lain tidak dicampur.</p>
      <div className="notice"><strong>Harga kamar: {new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(price)}</strong><br/><small>Harga per bulan, mengikuti harga kamar yang dipublikasikan dari KOSTPRO.</small></div>
      {!propertyId||!roomId
        ? <div className="notice">Kamar belum dipilih. Silakan kembali ke daftar kamar tersedia.</div>
        : <form onSubmit={submit}>
            <label>Nama lengkap<input required name="name" placeholder="Nama kamu" autoComplete="name"/></label>
            <label>Nomor WhatsApp<input required name="phone" placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel"/></label>
            <label>Tanggal masuk<input required name="checkIn" type="date"/></label>
            <label>Durasi<select name="duration" defaultValue="1"><option value="1">1 bulan</option><option value="3">3 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option></select></label>
            <button disabled={busy} type="submit">{busy?'Mengirim ke KOSTPRO…':'Kirim Booking'}</button>
            {message&&<div className="notice">{message}</div>}
          </form>}
    </div>
  </main>;
}
