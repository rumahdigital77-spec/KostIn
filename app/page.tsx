'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vynsxajbqkgkudfbraog.supabase.co',
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI'
);

type Room = { id?: string; source_room_id?: string; name: string; room_type?: string; price_monthly: number; status: string };
type Property = { id?: string; source_property_id?: string; name: string; city?: string; address?: string; cover_url?: string | null; rooms?: Room[]; rating?: number; review_count?: number };

export default function Home(){
 const [properties,setProperties]=useState<Property[]>([]);
 const [q,setQ]=useState('');
 const [source,setSource]=useState('MEMUAT');
 const [error,setError]=useState('');
 const [authOpen,setAuthOpen]=useState(false);
 const [authMode,setAuthMode]=useState<'signin'|'signup'>('signin');
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [authMessage,setAuthMessage]=useState('');
 const [loadingAuth,setLoadingAuth]=useState(false);
 const [userEmail,setUserEmail]=useState('');

 useEffect(()=>{
   fetch('/api/kostpro/properties',{cache:'no-store'})
     .then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.error||'Gagal membaca data KOSTPRO'); return d;})
     .then(async d=>{const list=Array.isArray(d.properties)?d.properties:[]; const rated=await Promise.all(list.map(async (p:Property)=>{const {data}=await supabase.rpc('get_kostin_property_reviews',{p_source_property_id:String(p.source_property_id||'')});const reviews=Array.isArray(data)?data:[];const avg=reviews.length?reviews.reduce((s:number,r:{rating:number})=>s+Number(r.rating||0),0)/reviews.length:0;return {...p,rating:Number(avg.toFixed(1)),review_count:reviews.length};}));setProperties(rated);setSource(d.source==='kostpro'?'KOSTPRO':'KOSONG');setError('');})
     .catch(e=>{setProperties([]);setSource('ERROR');setError(e instanceof Error?e.message:'Gagal membaca data KOSTPRO');});
   supabase.auth.getUser().then(({data})=>setUserEmail(data.user?.email||''));
 },[]);

 const filtered=useMemo(()=>properties.filter(p=>(p.name+' '+(p.city||'')+' '+(p.address||'')).toLowerCase().includes(q.toLowerCase())),[properties,q]);
 const propertyHref=(p:Property)=>'/kost/'+encodeURIComponent(String(p.source_property_id||p.id||''));

 async function submitAuth(e:React.FormEvent){
   e.preventDefault(); setLoadingAuth(true); setAuthMessage('');
   try{
    if(authMode==='signup'){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
      if(error) throw error;
      setAuthMessage(data.session?'Pendaftaran berhasil.':'Pendaftaran berhasil. Silakan cek email untuk verifikasi.');
      if(data.session) setUserEmail(data.user?.email||email);
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      setUserEmail(data.user?.email||email); setAuthMessage('Berhasil masuk.'); setTimeout(()=>setAuthOpen(false),700);
    }
   }catch(err){setAuthMessage(err instanceof Error?err.message:'Proses gagal.');}
   finally{setLoadingAuth(false);}
 }

 async function logout(){await supabase.auth.signOut();setUserEmail('');}

 return <main>
  <header>
   <div className="brand"><span className="logo">K</span><div><b>KostIn</b><small>Cari Kost. Pilih Kamar. Langsung Booking.</small></div></div>
   <div className="authActions">
    {userEmail?<><span className="userEmail">{userEmail}</span><button className="authIconBtn logoutIcon" aria-label="Sign out" title="Sign out" onClick={logout}>⇥</button></>:<>
      <button className="authIconBtn" aria-label="Sign in" title="Sign in" onClick={()=>{setAuthMode('signin');setAuthMessage('');setAuthOpen(true)}}>↪</button>
      <button className="authIconBtn signupIcon" aria-label="Sign up" title="Sign up" onClick={()=>{setAuthMode('signup');setAuthMessage('');setAuthOpen(true)}}>✚</button>
    </>}
   </div>
  </header>

  {authOpen&&<div className="authOverlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}>
   <section className="authModal">
    <button className="authClose" onClick={()=>setAuthOpen(false)}>×</button>
    <div className="authIconBig">{authMode==='signin'?'↪':'✚'}</div>
    <span className="eyebrow">{authMode==='signin'?'SIGN IN':'SIGN UP'}</span>
    <h2>{authMode==='signin'?'Masuk ke KostIn':'Buat akun KostIn'}</h2>
    <p>{authMode==='signin'?'Masuk untuk melanjutkan booking.':'Daftar singkat untuk menyimpan akun dan riwayat booking.'}</p>
    <form onSubmit={submitAuth}>
      {authMode==='signup'&&<label>Nama<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Nama lengkap"/></label>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="nama@email.com"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} placeholder="Minimal 6 karakter"/></label>
      <button className="authSubmit" disabled={loadingAuth}>{loadingAuth?'MEMPROSES...':authMode==='signin'?'SIGN IN':'SIGN UP'}</button>
    </form>
    {authMessage&&<div className="authMessage">{authMessage}</div>}
    <button className="textButton" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthMessage('')}}>
      {authMode==='signin'?'Belum punya akun? Sign up':'Sudah punya akun? Sign in'}
    </button>
   </section>
  </div>}

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
   <div className="sectionHead"><div><span className="eyebrow">PROPERTI KOST</span><h2>Pilih properti</h2></div></div>
   <div className="propertyGrid">
    {filtered.map(p=>{const available=(p.rooms||[]).filter(r=>String(r.status).toUpperCase()==='AVAILABLE').length; return <Link className="propertyCard" href={propertyHref(p)} key={p.source_property_id||p.id||p.name}>
      <div className="propertyPhoto">{p.cover_url?<img src={p.cover_url} alt={p.name}/>:<span>🏠</span>}<label>{available} KAMAR TERSEDIA</label><span className="propertyArrow">→</span></div>
      <div className="propertyBody"><div className="place">{p.city||'Indonesia'}</div><h3>{p.name}</h3><p>{p.address||'Lihat tipe kamar yang tersedia'}</p><div className="ratingPreview">{p.review_count?<><span className="stars" aria-label={`Rating ${p.rating} dari 5`}>{[1,2,3,4,5].map(i=><span key={i}>{i<=Math.round(p.rating||0)?'★':'☆'}</span>)}</span><span className="ratingNumber">{p.rating?.toFixed(1)}</span><span className="reviewCount">({p.review_count} ulasan)</span></>:<span className="ratingEmpty">Belum ada ulasan</span>}</div><strong>Lihat kamar yang tersedia <span>→</span></strong></div>
    </Link>})}
   </div>
   {error&&<div className="empty">Data KOSTPRO belum dapat dibaca. {error}</div>}
   {!error&&filtered.length===0&&<div className="empty">Belum ada properti dengan kamar tersedia untuk pencarian ini.</div>}
  </section>
  <footer>KostIn © 2026</footer>
 </main>;
}
