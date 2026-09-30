'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Booking={id:string;guest_name:string;guest_phone:string;check_in:string;duration_months:number;status:string;property_id:string;room_id:string};

export default function PartnerDashboard(){
 const [user,setUser]=useState<any>(null); const [bookings,setBookings]=useState<Booking[]>([]); const [loading,setLoading]=useState(true); const [message,setMessage]=useState('');
 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser(); setUser(user);
  if(!user){setLoading(false);return;}
  const {data,error}=await supabase.from('bookings').select('*').order('created_at',{ascending:false});
  setBookings(data||[]); if(error)setMessage(error.message); setLoading(false);
 }
 useEffect(()=>{load(); const {data}=supabase.auth.onAuthStateChange(()=>load()); return()=>data.subscription.unsubscribe();},[]);
 async function logout(){await supabase.auth.signOut();setUser(null);setBookings([]);}
 if(!user)return <main className="dashboardPage"><a className="login" href="/">← Marketplace</a><div className="dashCard authCard"><span className="eyebrow">KOSTIN PARTNER</span><h1>Login Pemilik</h1><p>Masuk untuk melihat booking property yang terhubung ke akunmu.</p><button onClick={()=>setMessage('Login email/password akan diaktifkan setelah halaman auth berikutnya tersambung.')}>Login</button>{message&&<div className="notice">{message}</div>}</div></main>;
 return <main className="dashboardPage"><header className="dashHeader"><div><span className="eyebrow">KOSTIN PARTNER</span><h1>Dashboard Pemilik</h1><p>{user.email}</p></div><button className="login" onClick={logout}>Logout</button></header><section className="dashNotice"><b>🔒 Booking privat</b><span>RLS hanya mengizinkan booking dari property yang terhubung ke akun ini.</span></section><section className="dashCard"><div className="cardHead"><div><span className="eyebrow">BOOKING</span><h2>Booking terbaru</h2></div><button onClick={load}>Refresh</button></div>{loading?<p>Memuat…</p>:bookings.length===0?<div className="emptyDash"><div>📋</div><h3>Belum ada booking</h3><p>Tidak ada booking pada property yang terhubung.</p></div>:<div className="bookingTable">{bookings.map(b=><div className="bookingItem" key={b.id}><b>{b.guest_name}</b><span>{b.guest_phone}</span><span>Check-in: {b.check_in}</span><span>{b.duration_months} bulan · {b.status}</span></div>)}</div>}</section></main>;
}
