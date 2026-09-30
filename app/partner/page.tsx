'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Booking={id:string;guest_name:string;guest_phone:string;check_in:string;duration_months:number;status:string;property_id:string;room_id:string};
type Mode='login'|'signup';

export default function PartnerDashboard(){
 const [user,setUser]=useState<any>(null); const [bookings,setBookings]=useState<Booking[]>([]); const [properties,setProperties]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [mode,setMode]=useState<Mode>('login'); const [sourceId,setSourceId]=useState('');
 async function load(){
  setLoading(true); const {data:{user}}=await supabase.auth.getUser(); setUser(user);
  if(!user){setLoading(false);return;}
  const {data:members}=await supabase.from('property_members').select('property_id,role');
  const ids=(members||[]).map((m:any)=>m.property_id);
  if(ids.length){ const {data:ps}=await supabase.from('properties').select('*').in('id',ids); setProperties(ps||[]); const {data,error}=await supabase.from('bookings').select('*').in('property_id',ids).order('created_at',{ascending:false}); setBookings(data||[]); if(error)setMessage(error.message); } else {setProperties([]);setBookings([]);} if(error)setMessage(error.message); setLoading(false);
 }
 useEffect(()=>{load(); const {data}=supabase.auth.onAuthStateChange(()=>load()); return()=>data.subscription.unsubscribe();},[]);
 async function submitAuth(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault(); setBusy(true); setMessage(''); const f=new FormData(e.currentTarget); const email=String(f.get('email')||''); const password=String(f.get('password')||'');
  const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
  if(result.error)setMessage(result.error.message); else setMessage(mode==='signup'?'Akun berhasil dibuat. Jika konfirmasi email aktif, cek email lalu login.':'Login berhasil.');
  setBusy(false);
 }
 async function claim(){if(!sourceId.trim())return setMessage('Masukkan Property ID sumber KOSTPRO.');setBusy(true);setMessage('');const {error}=await supabase.rpc('claim_property',{p_source_property_id:sourceId.trim()});setMessage(error?error.message:'Property berhasil dihubungkan.');setSourceId('');setBusy(false);if(!error)load();}
 async function logout(){await supabase.auth.signOut();setUser(null);setBookings([]);setProperties([]);}
 if(!user)return <main className="dashboardPage"><a className="login" href="/">← Marketplace</a><div className="dashCard authCard"><span className="eyebrow">KOSTIN PARTNER</span><h1>{mode==='login'?'Login Pemilik':'Daftar Pemilik'}</h1><p>{mode==='login'?'Masuk untuk melihat booking property yang terhubung ke akunmu.':'Buat akun pemilik KostIn.'}</p><form onSubmit={submitAuth}><label>Email<input required type="email" name="email" placeholder="nama@email.com"/></label><label>Password<input required minLength={6} type="password" name="password" placeholder="Minimal 6 karakter"/></label><button disabled={busy} type="submit">{busy?'Memproses…':mode==='login'?'Login':'Daftar'}</button></form><button className="textButton" onClick={()=>{setMode(mode==='login'?'signup':'login');setMessage('')}}>{mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Login'}</button>{message&&<div className="notice">{message}</div>}</div></main>;
 return <main className="dashboardPage"><header className="dashHeader"><div><span className="eyebrow">KOSTIN PARTNER</span><h1>Dashboard Pemilik</h1><p>{user.email}</p></div><button className="login" onClick={logout}>Logout</button></header><section className="dashNotice"><b>🔒 Booking privat</b><span>RLS hanya mengizinkan booking dari property yang terhubung ke akun ini.</span></section><section className="dashCard"><div className="cardHead"><div><span className="eyebrow">PROPERTY</span><h2>Property saya</h2></div></div>{properties.length?<div className="bookingTable">{properties.map(p=><div className="bookingItem" key={p.id}><b>{p.name}</b><span>{p.city||'-'}</span><span>{p.address||'-'}</span><span>OWNER</span></div>)}</div>:<div><p>Belum ada property terhubung.</p><div className="claimForm"><input value={sourceId} onChange={e=>setSourceId(e.target.value)} placeholder="Property ID KOSTPRO"/><button disabled={busy} onClick={claim}>{busy?'Menghubungkan…':'Hubungkan Property'}</button></div></div>}</section><section className="dashCard"><div className="cardHead"><div><span className="eyebrow">BOOKING</span><h2>Booking terbaru</h2></div><button onClick={load}>Refresh</button></div>{loading?<p>Memuat…</p>:bookings.length===0?<div className="emptyDash"><div>📋</div><h3>Belum ada booking</h3><p>Tidak ada booking pada property yang terhubung.</p></div>:<div className="bookingTable">{bookings.map(b=><div className="bookingItem" key={b.id}><b>{b.guest_name}</b><span>{b.guest_phone}</span><span>Check-in: {b.check_in}</span><span>{b.duration_months} bulan · {b.status}</span></div>)}</div>}</section></main>;
}
