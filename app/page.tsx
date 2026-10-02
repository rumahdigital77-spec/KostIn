'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vynsxajbqkgkudfbraog.supabase.co',
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI'
);

type Room = { id?: string; source_room_id?: string; name: string; room_type?: string; price_monthly: number; status: string };
type Review = { rating:number; comment:string; reviewer_name:string; created_at:string };
type Property = { id?: string; source_property_id?: string; name: string; city?: string; address?: string; cover_url?: string | null; rooms?: Room[]; rating?: number; review_count?: number; reviews?: Review[] };

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
 const [eligibleBookings,setEligibleBookings]=useState<Record<string,{id:string;room_name:string;check_in:string;reviewed:boolean}[]>>({});
 const [reviewPropertyId,setReviewPropertyId]=useState('');
 const [reviewBooking,setReviewBooking]=useState('');
 const [reviewRating,setReviewRating]=useState(5);
 const [reviewComment,setReviewComment]=useState('');
 const [reviewMessage,setReviewMessage]=useState('');
 const [reviewBusy,setReviewBusy]=useState(false);

 useEffect(()=>{
   let cancelled=false;
   const loadLiveRooms=async()=>{
     try{
       const response=await fetch('/api/kostpro/properties?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
       const d=await response.json();
       if(!response.ok) throw new Error(d.error||'Gagal membaca data KOSTPRO');
       const list=Array.isArray(d.properties)?d.properties:[];
       const rated=await Promise.all(list.map(async (p:Property)=>{
         const {data}=await supabase.rpc('get_kostin_property_reviews',{p_source_property_id:String(p.source_property_id||'')});
         const reviews=Array.isArray(data)?data:[];
         const avg=reviews.length?reviews.reduce((s:number,r:{rating:number})=>s+Number(r.rating||0),0)/reviews.length:0;
         return {...p,rooms:Array.isArray(p.rooms)?p.rooms.filter(r=>String(r.status||'').toUpperCase()==='AVAILABLE'):[],rating:Number(avg.toFixed(1)),review_count:reviews.length,reviews:reviews.slice(0,2)};
       }));
       if(!cancelled){setProperties(rated);setSource(d.source==='kostpro'?'KOSTPRO':'KOSONG');setError('');}
     }catch(e){ if(!cancelled){setProperties([]);setSource('ERROR');setError(e instanceof Error?e.message:'Gagal membaca data KOSTPRO');} }
   };
   loadLiveRooms();
   const timer=window.setInterval(loadLiveRooms,1000);
   const onVisible=()=>{if(document.visibilityState==='visible') loadLiveRooms();};
   document.addEventListener('visibilitychange',onVisible);
   supabase.auth.getUser().then(({data})=>{if(!cancelled)setUserEmail(data.user?.email||'');});
   return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[]);

 const filtered=useMemo(()=>properties.filter(p=>(p.name+' '+(p.city||'')+' '+(p.address||'')).toLowerCase().includes(q.toLowerCase())),[properties,q]);
 const propertyHref=(p:Property)=>'/kost/'+encodeURIComponent(String(p.source_property_id||p.id||''));

 const propertyIdsKey=useMemo(()=>properties.map(p=>String(p.source_property_id||p.id||'')).filter(Boolean).sort().join(','),[properties]);
 useEffect(()=>{
   let cancelled=false;
   async function loadEligibility(){
     if(!userEmail||!propertyIdsKey){setEligibleBookings({});return;}
     const entries=await Promise.all(propertyIdsKey.split(',').map(async id=>{const {data}=await supabase.rpc('get_my_completed_kostin_bookings',{p_source_property_id:id});return [id,Array.isArray(data)?data:[]] as const;}));
     if(!cancelled)setEligibleBookings(Object.fromEntries(entries));
   }
   loadEligibility();
   return()=>{cancelled=true;};
 },[userEmail,propertyIdsKey]);

 async function submitReview(){
   if(!reviewBooking)return;
   setReviewBusy(true);setReviewMessage('');
   const {error}=await supabase.rpc('create_kostin_review',{p_booking_id:reviewBooking,p_rating:reviewRating,p_comment:reviewComment});
   if(error){setReviewMessage(error.message);}
   else{
     setReviewMessage('Terima kasih. Bintang dan komentar berhasil dipublikasikan.');
     setReviewComment('');setReviewBooking('');setReviewRating(5);
     const id=reviewPropertyId;
     const {data}=await supabase.rpc('get_my_completed_kostin_bookings',{p_source_property_id:id});
     setEligibleBookings(prev=>({...prev,[id]:Array.isArray(data)?data:[]}));
     const reviews=await supabase.rpc('get_kostin_property_reviews',{p_source_property_id:id});
     const list=Array.isArray(reviews.data)?reviews.data:[];
     setProperties(prev=>prev.map(p=>String(p.source_property_id||p.id)===id?{...p,rating:list.length?Number((list.reduce((a:number,r:Review)=>a+Number(r.rating||0),0)/list.length).toFixed(1)):0,review_count:list.length,reviews:list.slice(0,2)}:p));
   }
   setReviewBusy(false);
 }

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
  <header className="siteHeader">
   <div className="brand"><span className="logo">K</span><div><b>Kost<span>In</span></b><small>LIVE KOST MARKETPLACE</small></div></div>
   <nav className="mainNav"><Link href="/">Cari Kost</Link><a href="#properti">Properti</a><a href="#cara">Cara Booking</a></nav>
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

  <section className="hero premiumHero">
   <div><span className="eyebrow">MARKETPLACE KHUSUS KOST</span><h1>Temukan kost yang <em>pas</em> untukmu.</h1><p>Pilih properti terlebih dahulu. Klik properti untuk melihat tipe kamar yang sedang tersedia.</p></div>
   <div className="search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="📍 Kota, area, atau nama kost"/><button>Cari Kost</button></div>
  </section>
  <section className="stats premiumStats">
   <div><b>{filtered.length}</b><span>Properti tersedia</span></div>
   <div><b>{filtered.reduce((n,p)=>n+(p.rooms||[]).filter(r=>String(r.status).toUpperCase()==='AVAILABLE').length,0)}</b><span>Total kamar tersedia</span></div>
   <div><b>{source}</b><span>Sumber data</span></div>
  </section>
  <section className="section" id="properti">
   <div className="sectionHead"><div><span className="eyebrow">PROPERTI KOST</span><h2>Pilih properti</h2></div></div>
   <div className="propertyGrid">
    {filtered.map(p=>{const available=(p.rooms||[]).filter(r=>String(r.status).toUpperCase()==='AVAILABLE').length; const pid=String(p.source_property_id||p.id||''); const mine=(eligibleBookings[pid]||[]).filter(b=>!b.reviewed); return <article className="propertyCard" key={pid||p.name}>
      <Link href={propertyHref(p)}>
        <div className="propertyPhoto">{p.cover_url?<img src={p.cover_url} alt={p.name}/>:<span>🏠</span>}<label>{available} KAMAR TERSEDIA</label><span className="propertyArrow">→</span></div>
        <div className="propertyBody"><div className="place">{p.city||'Indonesia'}</div><h3>{p.name}</h3><p>{p.address||'Lihat tipe kamar yang tersedia'}</p><div className="ratingPreview"><span className="stars" aria-label={`Rating ${p.rating||0} dari 5`}>{[1,2,3,4,5].map(i=><span key={i}>{i<=Math.round(p.rating||0)?'★':'☆'}</span>)}</span><span className="ratingNumber">{Number(p.rating||0).toFixed(1)}</span><span className="reviewCount">({p.review_count||0} Review)</span></div>
          {p.reviews&&p.reviews.length>0&&<div className="propertyReviewSnippets">{p.reviews.map((r,i)=><div key={i}><span>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span><p>"{r.comment}"</p><small>{r.reviewer_name||'Tamu Terverifikasi'}</small></div>)}</div>}
          <strong>Lihat kamar yang tersedia <span>→</span></strong></div>
      </Link>
      {userEmail&&mine.length>0&&<div className="homeReviewInvite"><span>✓ Sudah C.I. di kost ini</span><button type="button" onClick={()=>{setReviewPropertyId(pid);setReviewBooking(mine[0].id);setReviewRating(5);setReviewComment('');setReviewMessage('');}}>★ Beri bintang & komentar</button></div>}
    </article>})}
   </div>
   {error&&<div className="empty">Data KOSTPRO belum dapat dibaca. {error}</div>}
   {!error&&filtered.length===0&&<div className="empty">Belum ada properti dengan kamar tersedia untuk pencarian ini.</div>}
  </section>
  <section className="trustStrip" id="cara"><div><span>01</span><b>Pilih properti</b><small>Lihat kamar yang tersedia secara live.</small></div><div><span>02</span><b>Pilih kamar</b><small>Harga mengikuti master KOSTPRO.</small></div><div><span>03</span><b>Booking</b><small>Kirim data langsung ke property.</small></div></section><footer>KostIn © 2026 · Live inventory by KOSTPRO</footer>
 </main>;
}
