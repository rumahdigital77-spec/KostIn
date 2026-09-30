'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Booking() {
  const [propertyId,setPropertyId]=useState('');
  const [roomId,setRoomId]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{const p=new URLSearchParams(window.location.search);setPropertyId(p.get('propertyId')||'');setRoomId(p.get('roomId')||'');},[]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage('');
    const form=new FormData(e.currentTarget);
    const {error}=await supabase.rpc('create_pending_booking', {
      p_property_id:propertyId, p_room_id:roomId, p_guest_name:String(form.get('name')||''),
      p_guest_phone:String(form.get('phone')||''), p_check_in:String(form.get('checkIn')||''),
      p_duration_months:Number(form.get('duration')||1)
    });
    setBusy(false);
    setMessage(error?'Booking belum berhasil. Kamar mungkin sudah tidak tersedia.':'Booking berhasil dikirim. Status: menunggu konfirmasi.');
    if(!error)e.currentTarget.reset();
  }

  return <main className="bookingPage"><a href="/" className="back">← Kembali</a><div className="bookingCard">
    <span className="eyebrow">BOOKING KAMAR</span><h1>Amankan kamar pilihanmu.</h1>
    <p>Booking tersimpan di database KostIn. Database KOSTPRO tidak pernah ditulis dari halaman ini.</p>
    {!propertyId||!roomId?<div className="notice">Kamar belum dipilih. Silakan kembali ke daftar kamar tersedia.</div>:<form onSubmit={submit}>
      <label>Nama lengkap<input required name="name" placeholder="Nama kamu"/></label>
      <label>Nomor WhatsApp<input required name="phone" placeholder="08xxxxxxxxxx"/></label>
      <label>Tanggal masuk<input required name="checkIn" type="date"/></label>
      <label>Durasi<select name="duration" defaultValue="1"><option value="1">1 bulan</option><option value="3">3 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option></select></label>
      <button disabled={busy} type="submit">{busy?'Mengirim…':'Kirim Booking'}</button>{message&&<div className="notice">{message}</div>}
    </form>}
  </div></main>;
}
