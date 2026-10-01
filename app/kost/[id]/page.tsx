'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Room = { id?: string; source_room_id?: string; name: string; room_type?: string; price_monthly: number; status: string };
type Review = { rating:number; comment:string; reviewer_name:string; created_at:string };
type CompletedBooking = { id:string; room_name:string; check_in:string; reviewed:boolean };
type Property = {
  id?: string;
  source_property_id?: string;
  name: string;
  city?: string;
  address?: string;
  cover_url?: string | null;
  facilities?: string[] | Record<string, unknown>;
  rooms?: Room[];
};

const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);

export default function PropertyDetail(){
  const params=useParams<{id:string}>();
  const [property,setProperty]=useState<Property|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [reviews,setReviews]=useState<Review[]>([]);
  const [completed,setCompleted]=useState<CompletedBooking[]>([]);
  const [reviewBooking,setReviewBooking]=useState('');
  const [reviewRating,setReviewRating]=useState(5);
  const [reviewComment,setReviewComment]=useState('');
  const [reviewMessage,setReviewMessage]=useState('');
  const [reviewBusy,setReviewBusy]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    const loadLiveProperty=async()=>{
      try{
        const r=await fetch('/api/kostpro/properties?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
        const d=await r.json();
        if(!r.ok) throw new Error(d.error||'Gagal mengambil data KOSTPRO.');
        const list=Array.isArray(d.properties)?d.properties:[];
        const found=list.find((p:Property)=>String(p.source_property_id||p.id)===String(params.id));
        if(!cancelled){
          if(found) setProperty({...found,rooms:Array.isArray(found.rooms)?found.rooms.filter((room:Room)=>String(room.status||'').toUpperCase()==='AVAILABLE'):[]});
          else setError('Data kost tidak ditemukan atau belum dipublikasikan.');
          setLoading(false);
        }
      }catch(e){if(!cancelled){setError(e instanceof Error?e.message:'Gagal mengambil data kost.');setLoading(false);}}
    };
    loadLiveProperty();
    const timer=window.setInterval(loadLiveProperty,5000);
    const onVisible=()=>{if(document.visibilityState==='visible') loadLiveProperty();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[params.id]);

  const rooms=useMemo(()=>property?.rooms?.filter(r=>String(r.status).toUpperCase()==='AVAILABLE')||[],[property]);
  useEffect(()=>{
    if(!params.id) return;
    supabase.rpc('get_kostin_property_reviews',{p_source_property_id:String(params.id)}).then(({data})=>setReviews(Array.isArray(data)?data:[]));
    supabase.auth.getUser().then(({data})=>{ if(!data.user) return; supabase.rpc('get_my_completed_kostin_bookings',{p_source_property_id:String(params.id)}).then(({data})=>setCompleted(Array.isArray(data)?data:[])); });
  },[params.id]);
  const average=reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0;
  async function submitReview(){
    if(!reviewBooking) return;
    setReviewBusy(true); setReviewMessage('');
    const {error}=await supabase.rpc('create_kostin_review',{p_booking_id:reviewBooking,p_rating:reviewRating,p_comment:reviewComment});
    if(error) setReviewMessage(error.message); else { setReviewMessage('Terima kasih. Ulasan berhasil dipublikasikan.'); setReviewComment(''); setReviewBooking(''); const {data}=await supabase.rpc('get_kostin_property_reviews',{p_source_property_id:String(params.id)}); setReviews(Array.isArray(data)?data:[]); const mine=await supabase.rpc('get_my_completed_kostin_bookings',{p_source_property_id:String(params.id)}); setCompleted(Array.isArray(mine.data)?mine.data:[]); }
    setReviewBusy(false);
  }
  const facilities=Array.isArray(property?.facilities)?property?.facilities:[];

  if(loading) return <main className="detailPage"><div className="detailLoading">Memuat detail kost...</div></main>;
  if(error||!property) return <main className="detailPage"><Link href="/" className="back">← Kembali</Link><div className="detailEmpty"><h1>Kost tidak tersedia</h1><p>{error}</p></div></main>;

  return <main className="detailPage">
    <Link href="/" className="back">← Kembali ke daftar kost</Link>
    <section className="detailHero">
      <div className="detailPhoto">
        {property.cover_url?<img src={property.cover_url} alt={property.name}/>:<span>🏠</span>}
      </div>
      <div className="detailInfo">
        <span className="eyebrow">KOST TERSEDIA</span>
        <h1>{property.name}</h1>
        <p className="detailLocation">📍 {property.address||property.city||'Indonesia'}</p>
        <p>Status kamar dibaca langsung dari KOSTPRO secara READ-ONLY. Hanya kamar dengan status AVAILABLE yang dapat dipilih.</p>
        {facilities.length>0&&<div className="facilityList">{facilities.map((f,i)=><span key={i}>{String(f)}</span>)}</div>}
      </div>
    </section>

    <section className="roomSection">
      <div className="sectionHead"><div><span className="eyebrow">KAMAR TERSEDIA</span><h2>Pilih kamar</h2></div><span className="roomCount">{rooms.length} kamar tersedia</span></div>
      {rooms.length===0?<div className="detailEmpty"><h3>Belum ada kamar tersedia</h3><p>Kamar yang RESERVED, OCCUPIED, MAINTENANCE, atau CLEANING tidak ditampilkan.</p></div>:
      <div className="roomList">{rooms.map(r=><article className="roomRow" key={r.source_room_id||r.id}>
        <div><span className="roomBadge">TERSEDIA</span><h3>{r.name}</h3><p>{r.room_type||'Kamar'} · Status {r.status}</p></div>
        <div className="roomPrice"><strong>{money(Number(r.price_monthly))}</strong><small>/bulan</small><Link className="book" href={'/booking?propertyId='+encodeURIComponent(String(property.source_property_id||property.id||''))+'&roomId='+encodeURIComponent(String(r.source_room_id||r.id||''))+'&price=ignored}>Booking Kamar</Link></div>
      </article>)}</div>}
    </section>

    <section className="reviewSection">
      <div className="sectionHead"><div><span className="eyebrow">ULASAN TAMU</span><h2>Pengalaman penghuni</h2></div><span className="roomCount">{average?average.toFixed(1):'—'} ★ · {reviews.length} ulasan</span></div>
      {completed.some(b=>!b.reviewed)&&<div className="reviewCard">
        <strong>Bagaimana pengalamanmu?</strong><p>Ulasan hanya bisa diberikan oleh user yang booking-nya sudah berstatus C.O./COMPLETED.</p>
        <select value={reviewBooking} onChange={e=>setReviewBooking(e.target.value)}><option value="">Pilih riwayat C.O.</option>{completed.filter(b=>!b.reviewed).map(b=><option key={b.id} value={b.id}>{b.room_name} · {b.check_in}</option>)}</select>
        <div className="starPicker">{[1,2,3,4,5].map(n=><button type="button" key={n} className={n<=reviewRating?'starActive':'star'} onClick={()=>setReviewRating(n)}>★</button>)}</div>
        <textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)} minLength={3} maxLength={1000} placeholder="Tulis pengalamanmu..." />
        <button className="reviewSubmit" disabled={reviewBusy||!reviewBooking||reviewComment.trim().length<3} onClick={submitReview}>{reviewBusy?'Mengirim…':'Kirim Ulasan'}</button>
        {reviewMessage&&<div className="notice">{reviewMessage}</div>}
      </div>}
      {reviews.length===0?<div className="detailEmpty"><h3>Belum ada ulasan</h3><p>Ulasan akan muncul setelah tamu selesai C.O. dan memberikan penilaian.</p></div>:<div className="reviewList">{reviews.map((r,i)=><article className="reviewItem" key={i}><div className="reviewTop"><strong>{r.reviewer_name||'Tamu Terverifikasi'}</strong><span>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span></div><p>{r.comment}</p><small>{new Date(r.created_at).toLocaleDateString('id-ID')}</small></article>)}</div>}
    </section>
  </main>;
}
