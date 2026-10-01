'use client';

// KostIn booking is intentionally public: guests do not need to log in to submit a booking.

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const KOSTPRO_URL = process.env.NEXT_PUBLIC_KOSTPRO_SUPABASE_URL || 'https://vynsxajbqkgkudfbraog.supabase.co';
const KOSTPRO_KEY = process.env.NEXT_PUBLIC_KOSTPRO_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';
const supabase = createClient(KOSTPRO_URL, KOSTPRO_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

export default function Booking() {
  const [propertyId,setPropertyId]=useState('');
  const [roomId,setRoomId]=useState('');
  const [rpcPropertyId,setRpcPropertyId]=useState<string>('');
  const [rpcRoomId,setRpcRoomId]=useState<string>('');
  const [price,setPrice]=useState(0);
  const [roomName,setRoomName]=useState('');
  const [roomType,setRoomType]=useState('');
  const [roomStatus,setRoomStatus]=useState('LOADING');
  const [paymentMethod,setPaymentMethod]=useState('TRANSFER_BANK');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    setPropertyId(p.get('propertyId')||'');
    setRoomId(p.get('roomId')||'');
  },[]);

  useEffect(()=>{
    let cancelled=false;
    const loadLiveRoom=async()=>{
      if(!propertyId || !roomId) return;
      try{
        const response=await fetch('/api/kostpro/properties?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
        const d=await response.json();
        if(!response.ok) throw new Error(d.error||'Gagal membaca status kamar KOSTPRO.');
        const property=(Array.isArray(d.properties)?d.properties:[]).find((p:any)=>String(p.source_property_id||p.id)===String(propertyId));
        const room=(Array.isArray(property?.rooms)?property.rooms:[]).find((r:any)=>String(r.source_room_id||r.id)===String(roomId));
        if(cancelled) return;
        if(!room || String(room.status||'').toUpperCase()!=='AVAILABLE'){
          setRoomStatus('UNAVAILABLE');
          setPrice(0);
          setRoomName('');
          setRoomType('');
          setRpcPropertyId('');
          setRpcRoomId('');
          return;
        }
        // KOSTPRO public feed exposes the master/source IDs. Those are the
        // canonical IDs accepted by the KOSTPRO booking RPC.
        const canonicalPropertyId = String(property?.source_property_id || property?.id || '');
        const canonicalRoomId = String(room?.source_room_id || room?.id || '');
        if (!canonicalPropertyId || !canonicalRoomId) {
          setRoomStatus('ERROR');
          setPrice(0);
          setMessage('ID internal kamar KOSTPRO belum tersedia. Booking dihentikan agar tidak salah property.');
          return;
        }
        setRpcPropertyId(canonicalPropertyId);
        setRpcRoomId(canonicalRoomId);
        setRoomName(String(room.name || room.room_name || 'Kamar terpilih'));
        setRoomType(String(room.room_type || 'Kamar'));
        setRoomStatus('AVAILABLE');
        setPrice(Math.max(0,Number(room.price_monthly)||0));
        setMessage('');
      }catch(err){
        if(!cancelled){setRoomStatus('ERROR');setPrice(0);setMessage('Status kamar KOSTPRO belum dapat dibaca. Booking dihentikan agar data tidak salah.');}
      }
    };
    loadLiveRoom();
    const timer=window.setInterval(loadLiveRoom,1000);
    const onVisible=()=>{if(document.visibilityState==='visible') loadLiveRoom();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[propertyId,roomId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const form=new FormData(e.currentTarget);

    try {
      const payload={
        propertyId: rpcPropertyId,
        roomId: rpcRoomId,
        name:String(form.get('name')||'').trim(),
        phone:String(form.get('phone')||'').trim(),
        checkIn:String(form.get('checkIn')||'').trim(),
        duration:Number(form.get('duration')||1),
        roomPrice:price,
        paymentMethod:String(form.get('paymentMethod')||'TRANSFER_BANK')
      };

      setMessage('⏳ Mengirim data booking ke KOSTPRO…');
      if (roomStatus !== 'AVAILABLE') {
        setMessage(roomStatus === 'UNAVAILABLE' ? 'Kamar sudah tidak tersedia di KOSTPRO. Silakan pilih kamar lain.' : 'Status kamar KOSTPRO belum tersedia. Silakan coba lagi.');
        return;
      }
      if (!payload.propertyId || !payload.roomId) {
        setMessage('Data internal kamar KOSTPRO belum siap. Silakan tunggu status kamar termuat lalu coba lagi.');
        return;
      }
      if (!payload.name || !payload.phone || !payload.checkIn || !payload.roomPrice) {
        setMessage('Mohon lengkapi data booking dan pastikan harga kamar tersedia.');
        return;
      }
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if(!response.ok || !result.success){
        const detail=String(result.error||'Booking ditolak oleh KOSTPRO.');
        setMessage(detail.includes('Kamar sudah tidak tersedia') ? 'Kamar sudah tidak tersedia. Silakan pilih kamar lain.' : detail.includes('Tanggal check-in') ? detail : detail.includes('Data booking') ? 'Mohon lengkapi semua data booking.' : detail.includes('Konfigurasi koneksi') ? 'Koneksi ke master KOSTPRO belum tersedia. Silakan coba lagi.' : 'Booking belum dapat dikirim ke KOSTPRO. Silakan coba lagi.');
        return;
      }
      const data = result.booking;
      const bookingId = typeof data === 'object' && data
        ? String((data as Record<string,unknown>).id || (data as Record<string,unknown>).booking_id || '')
        : '';
      if (!bookingId) {
        setMessage('KOSTPRO tidak mengembalikan ID booking. Data pembayaran tidak dibuat agar tidak tercampur.');
        return;
      }
      let paymentSaveError: { message: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await supabase.from('booking_payment_details').insert({
          booking_id: bookingId,
          property_id: payload.propertyId,
          room_id: payload.roomId,
          guest_name: payload.name,
          guest_phone: payload.phone,
          room_price: payload.roomPrice,
          payment_method: payload.paymentMethod,
          proof_path: 'BOOKING_KOSTIN',
        });
        paymentSaveError = result.error;
        if (!paymentSaveError) break;
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 350));
      }

      if (paymentSaveError) {
        setMessage('Booking berhasil dikirim, tetapi data pembayaran belum tersimpan. Silakan cek menu Booking KOSTPRO sebelum mengirim ulang.');
        return;
      }
      setMessage(`✅ Booking berhasil dikirim ke KOSTPRO. ID booking: ${bookingId}. Data kamar, harga, dan metode pembayaran sudah tersimpan.`);
      e.currentTarget.reset();
    } catch (error) {
      setMessage('❌ Booking gagal dikirim ke KOSTPRO. Periksa koneksi dan status kamar, lalu coba lagi.');
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
      <div className="notice"><strong>Kamar terpilih: {roomName || 'Memuat dari KOSTPRO…'}</strong>{roomType && <><br/><small>Tipe: {roomType}</small></>}<br/><strong>Harga kamar: {roomStatus==='AVAILABLE' ? new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(price) : 'Memuat dari KOSTPRO…'}</strong><br/><small>Status dan harga kamar dibaca live dari Room Status KOSTPRO. Harga dari URL/client tidak digunakan.</small></div>
      {!propertyId||!roomId
        ? <div className="notice">Kamar belum dipilih. Silakan kembali ke daftar kamar tersedia.</div>
        : <form onSubmit={submit}>
            <label>Kamar<input value={roomName ? `${roomName}${roomType ? ` · ${roomType}` : ''}` : 'Memuat kamar dari KOSTPRO…'} readOnly/></label>
            <label>Nama lengkap<input required name="name" placeholder="Nama kamu" autoComplete="name"/></label>
            <label>Nomor WhatsApp<input required name="phone" placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel"/></label>
            <label>Tanggal masuk<input required name="checkIn" type="date"/></label>
            <label>Durasi<select name="duration" defaultValue="1"><option value="1">1 bulan</option><option value="3">3 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option></select></label>
            <label>Harga kamar / bulan<input value={new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(price)} readOnly/></label>
            <label>Metode pembayaran<select name="paymentMethod" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="TRANSFER_BANK">Transfer Bank</option><option value="QRIS">QRIS</option><option value="E-WALLET">E-Wallet</option><option value="CASH">Tunai</option></select></label>
            <button disabled={busy||roomStatus!=='AVAILABLE'} type="submit">{busy?'Mengirim ke KOSTPRO…':'Kirim Booking'}</button>
            {message&&<div className="notice">{message}</div>}
          </form>}
    </div>
  </main>;
}
