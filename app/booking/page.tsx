'use client';

import { FormEvent, useSearchParams } from 'react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Booking() {
  const params = useSearchParams();
  const propertyId = params.get('propertyId') || '';
  const roomId = params.get('roomId') || '';
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMessage('');
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('bookings').insert({
      property_id: propertyId,
      room_id: roomId,
      guest_name: String(form.get('name') || ''),
      guest_phone: String(form.get('phone') || ''),
      check_in: String(form.get('checkIn') || ''),
      duration_months: Number(form.get('duration') || 1),
      status: 'PENDING',
    });
    setBusy(false);
    setMessage(error ? 'Booking belum berhasil. Kamar mungkin sudah tidak tersedia.' : 'Booking berhasil dikirim. Status: menunggu konfirmasi.');
    if (!error) e.currentTarget.reset();
  }

  return <main className="bookingPage"><a href="/" className="back">← Kembali</a><div className="bookingCard">
    <span className="eyebrow">BOOKING KAMAR</span><h1>Amankan kamar pilihanmu.</h1>
    <p>Booking tersimpan di database KostIn. Database KOSTPRO tidak pernah ditulis dari halaman ini.</p>
    {!propertyId || !roomId ? <div className="notice">Kamar belum dipilih. Silakan kembali ke daftar kamar tersedia.</div> : <form onSubmit={submit}>
      <label>Nama lengkap<input required name="name" placeholder="Nama kamu" /></label>
      <label>Nomor WhatsApp<input required name="phone" placeholder="08xxxxxxxxxx" /></label>
      <label>Tanggal masuk<input required name="checkIn" type="date" /></label>
      <label>Durasi<select name="duration" defaultValue="1"><option value="1">1 bulan</option><option value="3">3 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option></select></label>
      <button disabled={busy} type="submit">{busy ? 'Mengirim…' : 'Kirim Booking'}</button>
      {message && <div className="notice">{message}</div>}
    </form>}
  </div></main>;
}
