'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vynsxajbqkgkudfbraog.supabase.co',
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI'
);

type Room = {
  id?: string;
  source_room_id?: string;
  name: string;
  room_type?: string;
  price_monthly: number;
  status: string;
};

type Review = {
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
};

type Property = {
  id?: string;
  source_property_id?: string;
  name: string;
  city?: string;
  address?: string;
  cover_url?: string | null;
  rooms?: Room[];
  rating?: number;
  review_count?: number;
  reviews?: Review[];
};

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [q, setQ] = useState('');
  const [source, setSource] = useState('MEMUAT');
  const [error, setError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [eligibleBookings, setEligibleBookings] = useState<Record<string, { id: string; room_name: string; check_in: string; reviewed: boolean }[]>>({});
  const [reviewPropertyId, setReviewPropertyId] = useState('');
  const [reviewBooking, setReviewBooking] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadLiveRooms = async () => {
      try {
        const response = await fetch('/api/kostpro/properties?t=' + Date.now(), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        const d = await response.json();
        if (!response.ok) throw new Error(d.error || 'Gagal membaca data KOSTPRO');

        const list = Array.isArray(d.properties) ? d.properties : [];
        const rated = await Promise.all(
          list.map(async (p: Property) => {
            const { data } = await supabase.rpc('get_kostin_property_reviews', {
              p_source_property_id: String(p.source_property_id || ''),
            });
            const reviews = Array.isArray(data) ? data : [];
            const avg = reviews.length
              ? reviews.reduce((s: number, r: { rating: number }) => s + Number(r.rating || 0), 0) / reviews.length
              : 0;

            return {
              ...p,
              rooms: Array.isArray(p.rooms)
                ? p.rooms.filter((r) => String(r.status || '').toUpperCase() === 'AVAILABLE')
                : [],
              rating: Number(avg.toFixed(1)),
              review_count: reviews.length,
              reviews: reviews.slice(0, 2),
            };
          })
        );

        if (!cancelled) {
          setProperties(rated);
          setSource(d.source === 'kostpro' ? 'KOSTPRO' : 'KOSONG');
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setProperties([]);
          setSource('ERROR');
          setError(e instanceof Error ? e.message : 'Gagal membaca data KOSTPRO');
        }
      }
    };

    loadLiveRooms();
    const timer = window.setInterval(loadLiveRooms, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadLiveRooms();
    };
    document.addEventListener('visibilitychange', onVisible);

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserEmail(data.user?.email || '');
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const filtered = useMemo(
    () =>
      properties.filter((p) =>
        (p.name + ' ' + (p.city || '') + ' ' + (p.address || '')).toLowerCase().includes(q.toLowerCase())
      ),
    [properties, q]
  );

  const availableRooms = useMemo(
    () =>
      filtered.reduce(
        (total, property) =>
          total + (property.rooms || []).filter((r) => String(r.status).toUpperCase() === 'AVAILABLE').length,
        0
      ),
    [filtered]
  );

  const propertyHref = (p: Property) => '/kost/' + encodeURIComponent(String(p.source_property_id || p.id || ''));

  const propertyIdsKey = useMemo(
    () => properties.map((p) => String(p.source_property_id || p.id || '')).filter(Boolean).sort().join(','),
    [properties]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEligibility() {
      if (!userEmail || !propertyIdsKey) {
        setEligibleBookings({});
        return;
      }

      const entries = await Promise.all(
        propertyIdsKey.split(',').map(async (id) => {
          const { data } = await supabase.rpc('get_my_completed_kostin_bookings', {
            p_source_property_id: id,
          });
          return [id, Array.isArray(data) ? data : []] as const;
        })
      );

      if (!cancelled) setEligibleBookings(Object.fromEntries(entries));
    }

    loadEligibility();
    return () => {
      cancelled = true;
    };
  }, [userEmail, propertyIdsKey]);

  async function submitReview() {
    if (!reviewBooking) return;
    setReviewBusy(true);
    setReviewMessage('');

    const { error: rpcError } = await supabase.rpc('create_kostin_review', {
      p_booking_id: reviewBooking,
      p_rating: reviewRating,
      p_comment: reviewComment,
    });

    if (rpcError) {
      setReviewMessage(rpcError.message);
    } else {
      setReviewMessage('Terima kasih. Bintang dan komentar berhasil dipublikasikan.');
      setReviewComment('');
      setReviewBooking('');

      const id = reviewPropertyId;
      const reviews = await supabase.rpc('get_kostin_property_reviews', {
        p_source_property_id: id,
      });
      const list = Array.isArray(reviews.data) ? reviews.data : [];

      setProperties((prev) =>
        prev.map((p) =>
          String(p.source_property_id || p.id) === id
            ? {
                ...p,
                rating: list.length
                  ? Number(
                      (
                        list.reduce((a: number, r: Review) => a + Number(r.rating || 0), 0) / list.length
                      ).toFixed(1)
                    )
                  : 0,
                review_count: list.length,
                reviews: list.slice(0, 2),
              }
            : p
        )
      );
    }

    setReviewBusy(false);
  }

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthMessage('');

    try {
      if (authMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) throw signUpError;

        setAuthMessage(data.session ? 'Pendaftaran berhasil.' : 'Pendaftaran berhasil. Silakan cek email untuk verifikasi.');
        if (data.session) setUserEmail(data.user?.email || email);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        setUserEmail(data.user?.email || email);
        setAuthMessage('Berhasil masuk.');
        setTimeout(() => setAuthOpen(false), 700);
      }
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Proses gagal.');
    } finally {
      setLoadingAuth(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserEmail('');
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  return (
    <main className="kiDashboard">
      <aside className="kiSidebar">
        <div className="kiBrand">
          <div className="kiLogoMark">⌂</div>
          <div>
            <b>Kost<span>In</span></b>
            <small>Cari Kost. Pilih Kamar. Langsung Booking.</small>
          </div>
        </div>

        <nav className="kiSideNav">
          <Link className="active" href="/">
            <span>⌂</span> Beranda
          </Link>
          <a href="#properti">
            <span>⌕</span> Cari Kost
          </a>
          <a href="#favorit">
            <span>♥</span> Favorit
          </a>
          <Link href="/booking">
            <span>▣</span> Booking Saya
          </Link>
          <a href="#tentang">
            <span>ⓘ</span> Tentang KostIn
          </a>
        </nav>

        <div className="kiSidebarBottom">
          <div className="kiSidebarBuilding" />
          <div className="kiSidebarPitch">
            <b>✣ &nbsp; Kost Terbaik<br />&nbsp;&nbsp;&nbsp;&nbsp;Untuk Masa Depanmu</b>
            <span>⬟ &nbsp; Nyaman, Aman, Strategis</span>
          </div>
        </div>
      </aside>

      <section className="kiMain">
        <header className="kiTopbar">
          <div className="kiMobileBrand"><b>Kost<span>In</span></b></div>
          <div className="kiTopActions">
            <button className="kiBell" aria-label="Notifikasi">♧<i>0</i></button>
            {userEmail ? (
              <>
                <span className="kiGuest"><span className="kiUserIcon">●</span>{userEmail}<b>⌄</b></span>
                <button className="kiLogout" onClick={logout}>Logout</button>
              </>
            ) : (
              <button
                className="kiGuest kiGuestButton"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthMessage('');
                  setAuthOpen(true);
                }}
              >
                <span className="kiUserIcon">●</span> Hi, Guest <b>⌄</b>
              </button>
            )}
          </div>
        </header>

        <section className="kiHero">
          <div className="kiHeroCopy">
            <span className="kiHeroEyebrow">MARKETPLACE KHUSUS KOST</span>
            <h1>Temukan Kost Impianmu</h1>
            <p>Pilih properti favorit, lihat kamar yang tersedia,<br className="desktopOnly" /> dan booking dengan mudah.</p>

            <div className="kiSearchBar">
              <span>⌕</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama kost, lokasi..."
                aria-label="Cari nama kost atau lokasi"
              />
              <button type="button">● &nbsp; Lokasi &nbsp;⌄</button>
            </div>
          </div>
        </section>

        <section className="kiStatsRow" aria-label="Ringkasan properti">
          <div className="kiStat statBlue">
            <span className="kiStatIcon">▦</span>
            <div><b>{filtered.length}</b><small>Properti</small><em>Tersedia</em></div>
          </div>
          <div className="kiStat statPurple">
            <span className="kiStatIcon">▰</span>
            <div><b>{availableRooms}</b><small>Kamar</small><em>Siap Booking</em></div>
          </div>
          <div className="kiStat statGold">
            <span className="kiStatIcon">★</span>
            <div><b>{filtered.length ? (filtered.reduce((n, p) => n + Number(p.rating || 0), 0) / filtered.length).toFixed(1) : '0.0'}</b><small>Rating</small><em>( {filtered.reduce((n, p) => n + Number(p.review_count || 0), 0)} Review )</em></div>
          </div>
          <button className="kiSort">☷ &nbsp; Urutkan &nbsp;⌄</button>
        </section>

        <section className="kiPropertySection" id="properti">
          <div className="kiSectionTitle">
            <div>
              <span>PROPERTI KOST</span>
              <h2>Pilih properti favoritmu</h2>
            </div>
            <div className="kiLiveSource"><i /> LIVE · {source}</div>
          </div>

          <div className="kiPropertyGrid">
            {filtered.map((p, index) => {
              const pid = String(p.source_property_id || p.id || '');
              const available = (p.rooms || []).filter((r) => String(r.status).toUpperCase() === 'AVAILABLE').length;
              const mine = (eligibleBookings[pid] || []).filter((b) => !b.reviewed);
              const rating = Number(p.rating || 0);
              const accent = index % 3;

              return (
                <article className={'kiPropertyCard accent' + accent} key={pid || p.name} id={index === 0 ? 'favorit' : undefined}>
                  <Link href={propertyHref(p)} className="kiPropertyLink">
                    <div className="kiPropertyImage">
                      {p.cover_url ? (
                        <img src={p.cover_url} alt={p.name} />
                      ) : (
                        <img src="/kost.jpg" alt={p.name} />
                      )}
                      <span className="kiAvailability"><i /> Tersedia</span>
                      <button
                        className={'kiHeart ' + (favoriteIds.includes(pid) ? 'liked' : '')}
                        aria-label={favoriteIds.includes(pid) ? 'Hapus favorit' : 'Tambah favorit'}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(pid);
                        }}
                      >
                        {favoriteIds.includes(pid) ? '♥' : '♡'}
                      </button>
                    </div>

                    <div className="kiPropertyContent">
                      <div className="kiRating">
                        <span className="kiStars">{[1, 2, 3, 4, 5].map((i) => <span key={i}>{i <= Math.round(rating) ? '★' : '☆'}</span>)}</span>
                        <b>{rating.toFixed(1)}</b>
                        <small>({p.review_count || 0} Review)</small>
                      </div>
                      <h3>{p.name}</h3>
                      <p className="kiAddress">⌖ &nbsp;{p.address || p.city || 'Lokasi properti'}</p>

                      <div className="kiFacilities">
                        <span>⌁ WiFi</span>
                        <span>▣ Parkir</span>
                        <span>▱ AC</span>
                        <span>{accent === 2 ? '▰ CCTV' : accent === 1 ? '▣ Laundry' : '♨ Dapur'}</span>
                      </div>

                      <div className="kiRoomBar">
                        <div className="kiBedIcon">▰</div>
                        <div><b>{available} Kamar</b><small>Siap Booking</small></div>
                        <span className="kiRoomArrow">→</span>
                      </div>
                    </div>
                  </Link>

                  {userEmail && mine.length > 0 && (
                    <div className="homeReviewInvite">
                      <span>✓ Sudah C.I. di kost ini</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewPropertyId(pid);
                          setReviewBooking(mine[0].id);
                          setReviewRating(5);
                          setReviewComment('');
                          setReviewMessage('');
                        }}
                      >
                        ★ Beri review
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {error && <div className="kiEmpty">Koneksi KOSTPRO bermasalah: {error}</div>}
          {!error && filtered.length === 0 && <div className="kiEmpty">Belum ada properti dengan kamar tersedia.</div>}
        </section>

        <section className="kiAbout" id="tentang">
          <div><b>01</b><strong>Pilih properti</strong><small>Lihat kamar yang tersedia secara live.</small></div>
          <div><b>02</b><strong>Pilih kamar</strong><small>Harga mengikuti master KOSTPRO.</small></div>
          <div><b>03</b><strong>Booking</strong><small>Kirim data langsung ke properti.</small></div>
        </section>

        <footer className="kiFooter">KostIn © 2026 · Live inventory by KOSTPRO</footer>
      </section>

      {authOpen && (
        <div className="authOverlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
          <section className="authModal">
            <button className="authClose" onClick={() => setAuthOpen(false)}>×</button>
            <div className="authIconBig">{authMode === 'signin' ? '↪' : '✚'}</div>
            <span className="eyebrow">{authMode === 'signin' ? 'SIGN IN' : 'SIGN UP'}</span>
            <h2>{authMode === 'signin' ? 'Masuk ke KostIn' : 'Buat akun KostIn'}</h2>
            <p>{authMode === 'signin' ? 'Masuk untuk melanjutkan dan melihat booking kamu.' : 'Daftar singkat untuk menyimpan akun dan riwayat booking.'}</p>
            <form onSubmit={submitAuth}>
              {authMode === 'signup' && <label>Nama<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama lengkap" /></label>}
              <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nama@email.com" /></label>
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Minimal 6 karakter" /></label>
              <button className="authSubmit" disabled={loadingAuth}>{loadingAuth ? 'MEMPROSES...' : authMode === 'signin' ? 'SIGN IN' : 'SIGN UP'}</button>
            </form>
            {authMessage && <div className="authMessage">{authMessage}</div>}
            <button className="textButton" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>
              {authMode === 'signin' ? 'Belum punya akun? Sign up' : 'Sudah punya akun? Sign in'}
            </button>
          </section>
        </div>
      )}

      {(reviewPropertyId && reviewBooking) && (
        <div className="authOverlay homeReviewOverlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setReviewPropertyId(''); }}>
          <section className="authModal homeReviewModal">
            <button className="authClose" onClick={() => setReviewPropertyId('')}>×</button>
            <span className="eyebrow">REVIEW TAMU</span>
            <h2>Beri bintang untuk properti</h2>
            <p>Review hanya tersedia untuk booking yang sudah selesai.</p>
            <div className="starPicker">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => setReviewRating(i)} aria-label={i + ' bintang'}>
                  {i <= reviewRating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Tulis pengalaman kamu..." />
            {reviewMessage && <div className="authMessage">{reviewMessage}</div>}
            <button className="reviewSubmit" disabled={reviewBusy} onClick={submitReview}>{reviewBusy ? 'MENGIRIM...' : 'KIRIM REVIEW'}</button>
          </section>
        </div>
      )}
    </main>
  );
}
