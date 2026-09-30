'use client';

import { useState } from 'react';

const demoStats=[
  ['Booking Baru','0','Menunggu konfirmasi'],
  ['Dikonfirmasi','0','Booking aktif'],
  ['Kamar Tersedia','—','Mengikuti KOSTPRO'],
  ['Pendapatan','—','Data transaksi belum diaktifkan']
];

export default function PartnerDashboard(){
  const [notice,setNotice]=useState('Dashboard partner siap. Login pemilik akan dihubungkan pada tahap autentikasi berikutnya.');
  return <main className="dashboardPage">
    <header className="dashHeader">
      <div><span className="eyebrow">KOSTIN PARTNER</span><h1>Dashboard Pemilik</h1><p>Kelola permintaan booking tanpa mengubah database KOSTPRO.</p></div>
      <a className="login" href="/">← Marketplace</a>
    </header>
    <section className="dashNotice"><b>🔒 Data booking terlindungi</b><span>{notice}</span></section>
    <section className="dashStats">{demoStats.map(([title,value,sub])=><article key={title}><span>{title}</span><strong>{value}</strong><small>{sub}</small></article>)}</section>
    <section className="dashGrid">
      <article className="dashCard">
        <div className="cardHead"><div><span className="eyebrow">BOOKING</span><h2>Booking terbaru</h2></div><button onClick={()=>setNotice('Data booking hanya akan tampil setelah akun pemilik terautentikasi.')}>Refresh</button></div>
        <div className="emptyDash"><div>📋</div><h3>Belum ada data yang ditampilkan</h3><p>Daftar booking akan tersedia untuk pemilik yang sudah login dan hanya untuk property miliknya.</p></div>
      </article>
      <article className="dashCard">
        <div className="cardHead"><div><span className="eyebrow">KAMAR</span><h2>Status kamar</h2></div></div>
        <div className="emptyDash"><div>🏠</div><h3>Sinkron dengan KOSTPRO</h3><p>Status kamar tetap berasal dari KOSTPRO. KostIn tidak mengubah status kamar master.</p></div>
      </article>
    </section>
    <footer>KostIn Partner © 2026 · KOSTPRO tetap master data · KostIn hanya membaca data master.</footer>
  </main>;
}
