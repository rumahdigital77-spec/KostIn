'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Room = { id?: string; source_room_id?: string; name: string; room_type?: string; price_monthly: number; status: string };
type Property = {
  id: string;
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

  useEffect(()=>{
    fetch('/api/kostpro/properties',{cache:'no-store'})
      .then(r=>r.json())
      .then(d=>{
        const list=Array.isArray(d.properties)?d.properties:[];
        const found=list.find((p:Property)=>String(p.source_property_id||p.id)===String(params.id));
        if(found) setProperty(found);
        else setError('Data kost tidak ditemukan atau belum dipublikasikan.');
      })
      .catch(()=>setError('Gagal mengambil data kost.'))
      .finally(()=>setLoading(false));
  },[params.id]);

  const rooms=useMemo(()=>property?.rooms?.filter(r=>String(r.status).toUpperCase()==='AVAILABLE')||[],[property]);
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
        <div className="roomPrice"><strong>{money(Number(r.price_monthly))}</strong><small>/bulan</small><Link className="book" href={'/booking?propertyId='+encodeURIComponent(property.id)+'&roomId='+encodeURIComponent(String(r.source_room_id||r.id||''))}>Booking Kamar</Link></div>
      </article>)}</div>}
    </section>
  </main>;
}
