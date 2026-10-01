# KostIn

**Cari Kost. Pilih Kamar. Langsung Booking.**

KostIn adalah marketplace khusus kost yang berdiri terpisah dari KOSTPRO.

## Aturan arsitektur
- KOSTPRO tetap menjadi **master/source of truth**.
- KostIn **tidak pernah INSERT, UPDATE, DELETE, atau migrate** database KOSTPRO.
- Data KOSTPRO masuk ke KostIn hanya melalui endpoint **GET/read-only** yang dikonfigurasi pada `KOSTPRO_READ_API_URL`.
- Browser tidak pernah diberi credential write KOSTPRO.
- Booking, akun marketplace, dan data transaksi KostIn disimpan di database KostIn sendiri.
- Hanya kamar dengan status `AVAILABLE` yang ditampilkan dan dapat dibooking.

## Alur
Cari lokasi → lihat kamar tersedia → pilih kamar → booking → booking masuk database KostIn.

## Environment
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), dan `KOSTPRO_READ_API_URL`.

## Deploy
Import repository ini sebagai **project Vercel baru bernama KostIn**. Jangan hubungkan repository ini ke project Vercel `kostpro`.

## Database
KostIn menggunakan Supabase project terpisah. Tabel utama:
- properties
- rooms
- bookings
- property_members

RLS aktif. Booking publik hanya boleh membuat status `PENDING` dan hanya jika kamar masih `AVAILABLE` serta property/room cocok.

Deployment trigger: production deployment verification.

Production verification: booking source-ID mapping fix.
