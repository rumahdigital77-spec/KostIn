'use client';

import { FormEvent, useEffect, useState } from 'react';

export default function Booking() {
  const [propertyId,setPropertyId]=useState('');
  const [roomId,setRoomId]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    setPropertyId(p.get('propertyId')||'');
    setRoomId(p.get('roomId')||'');
  },[]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const form=new FormData(e.currentTarget);

    try {
      const response=await fetch('/api/booking',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          propertyId,
          roomId,
          name:String(form.get('name')||''),
          phone:String(form.get('phone')||''),
          checkIn:String(form.get('checkIn')||''),
          duration:Number(form.get('duration')||1)
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.success){
        setMessage(result.error||'Booking belum berhasil dikirim ke KOSTPRO.');
        return;
      }
      setMessage('✓ Booking berhasil dikirim ke KOSTPRO. Status kamar sekarang RESERVED dan booking tercatat sebagai PENDING.');
      e.currentTarget.reset();
    } catch {
      setMessage('Koneksi booking gagal. Silakan coba lagi.');
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
