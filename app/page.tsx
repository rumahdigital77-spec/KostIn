'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Room = { id: string; name: string; room_type?: string; price_monthly: number; status: string };
type Property = { id: string; name: string; city?: string; address?: string; cover_url?: string | null; rooms?: Room[] };

const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);

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

 const filtered=useMemo(()=>properties.filter(p=>(p.name+' '+(p.city||'')+' '+(p.address||'')).toLowerCase().includes(q.toLowerCase())),[properties,q]);
 const available=filtered.flatMap(p=>(p.rooms||[]).filter(r=>String(r.status).toUpperCase()==='AVAILABLE').map(r=>({p,r})));

 return <main><header><div className="brand"><span className="logo">K</span><div><b>KostIn</b><small>Cari Kost. Pilih Kamar. Langsung Booking.</small></div></div><button className="login">Masuk</button></header>
 <section className="hero"><div><span className="eyebrow">MARKETPLACE KHUSUS KOST</span><h1>Temukan kost yang <em>pas</em> untukmu.</h1><p>Cari kamar yang benar-benar tersedia, lihat detail, lalu booking langsung.</p></div><div className="search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="📍 Kota, area, atau nama kost"/><button>Cari Kost</button></div></section>
 <section className="stats"><div><b>{properties.length}</b><span>Kost tampil</span></div><div><b>{available.length}</b><span>Kamar tersedia</span></div><div><b>{source}</b><span>Sumber data</span></div></section>
 <section className="section"><div className="sectionHead"><div><span className="eyebrow">KAMAR TERSEDIA</span><h2>Booking tanpa menebak status</h2></div></div>
 <div className="grid">{available.map(({p,r})=><article className="card" key={r.id}><div className="photo">{p.cover_url?<img src={p.cover_url} alt=""/>:<span>🏠</span>}<label>TERSEDIA</label></div><div className="body"><div className="place">{p.city||'Indonesia'}</div><h3>{p.name}</h3><div className="fac">🛏️ {r.name} · {r.room_type||'Kamar'}</div><div className="bottom"><strong>{money(Number(r.price_monthly))}<small>/bulan</small></strong></div><Link className="book" href={'/kost/'+encodeURIComponent(p.id)}>Lihat Detail & Booking</Link></div></article>)}</div>
 {error&&<div className="empty">Data KOSTPRO belum dapat dibaca. {error}</div>}
 {!error&&available.length===0&&<div className="empty">Belum ada kamar tersedia di KOSTPRO untuk pencarian ini.</div>}</section>
 <footer>KostIn © 2026</footer></main>;
}
