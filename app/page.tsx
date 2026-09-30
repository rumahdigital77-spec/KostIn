'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Room = { id?: string; source_room_id?: string; name: string; room_type?: string; price_monthly: number; status: string };
type Property = { id?: string; source_property_id?: string; name: string; city?: string; address?: string; cover_url?: string | null; rooms?: Room[] };

export default function Home(){
 const [properties,setProperties]=useState<Property[]>([]);
 const [q,setQ]=useState('');
 const [source,setSource]=useState('MEMUAT');
 const [error,setError]=useState('');

 useEffect(()=>{
   fetch('/api/kostpro/properties',{cache:'no-store'})
     .then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.error||'Gagal membaca data KOSTPRO'); return d;})
     .then(d=>{setProperties(Array.isArray(d.properties)?d.properties:[]);setSource(d.source==='kostpro'?'KOSTPRO':'KOSONG');setError('');})
     .catch(e=>{setProperties([]);setSource('ERROR');setError(e instanceof Error?e.message:'Gagal membaca data KOSTPRO');});
 },[]);

 const filtered=useMemo(
   ()=>properties.filter(p=>(p.name+' '+(p.city||'')+' '+(p.address||'')).toLowerCase().includes(q.toLowerCase())),
   [properties,q]
 );

 const propertyHref=(p:Property)=>'/kost/'+encodeURIComponent(String(p.source_property_id||p.id||''));

 return <main>
  <header>
   <div className="brand"><span className="logo">K</span><div><b>KostIn</b><small>Cari Kost. Pilih Kamar. Langsung Booking.</small></div></div>
   <button className="login">Masuk</button>
  </header>

  <section className="hero">
   <div><span className="eyebrow">MARKETPLACE KHUSUS KOST</span><h1>Temukan kost yang <em>pas</em> untukmu.</h1><p>Pilih properti terlebih dahulu. Klik properti untuk melihat tipe kamar yang sedang tersedia.</p></div>
   <div className="search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="📍 Kota, area, atau nama kost"/><button>Cari Kost</button></div>
  </section>

  <section className="stats">
   <div><b>{filtered.length}</b><span>Properti tersedia</span></div>
   <div><b>{filtered.reduce((n,p)=>n+(p.rooms||[]).filter(r=>String(r.status).toUpperCase()==='AVAILABLE').length,0)}</b><span>Total kamar tersedia</span></div>
   <div><b>{source}</b><span>Sumber data</span></div>
  </section>

  <section className="section">
   <div className="sectionHead">
    <div><span className="eyebrow">PROPERTI KOST</span><h2>Pilih properti</h2></div>
   </div>

   <div className="propertyGrid">
    {filtered.map(p=>{
      const available=(p.rooms||[]).filter(r=>String(r.status).toUpperCase()==='AVAILABLE').length;
      return <Link className="propertyCard" href={propertyHref(p)} key={p.source_property_id||p.id||p.name}>
       <div className="propertyPhoto">
        {p.cover_url?<img src={p.cover_url} alt={p.name}/>:<span>🏠</span>}
        <label>{available} KAMAR TERSEDIA</label>
        <span className="propertyArrow">→</span>
       </div>
       <div className="propertyBody">
        <div className="place">{p.city||'Indonesia'}</div>
        <h3>{p.name}</h3>
        <p>{p.address||'Lihat tipe kamar yang tersedia'}</p>
        <strong>Lihat kamar yang tersedia <span>→</span></strong>
       </div>
      </Link>;
    })}
   </div>

   {error&&<div className="empty">Data KOSTPRO belum dapat dibaca. {error}</div>}
   {!error&&filtered.length===0&&<div className="empty">Belum ada properti dengan kamar tersedia untuk pencarian ini.</div>}
  </section>

  <footer>KostIn © 2026</footer>
 </main>;
}
