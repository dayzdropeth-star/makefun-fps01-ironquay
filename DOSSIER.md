# IRONQUAY — Dossier

Tactical FPS 5v5 original (three.js, file statis, tanpa network) di pelabuhan
kontainer malam hari "Iron Quay": palet biru baja-abu, lampu sodium oranye,
kabut tipis.

## Cara main
- **Tujuan:** tim Tidebreakers (kamu + 4 bot) selalu menyerang. Menang ronde
  jika semua musuh Harbour Ward tereliminasi atau bom meledak. Kalah jika
  timmu habis, bom di-defuse, atau waktu 100 detik habis tanpa plant.
  Pertama sampai **5 ronde** menang match.
- **Bom:** kamu membawa bom. Di dalam Site A **Drydock** atau Site B
  **Warehouse** (radius 4,5 m dari tengah site), tahan **E** 2,5 detik untuk
  plant. Fuse 40 detik; bot Harbour akan datang defuse (5 detik). Ledakan =
  menang, defuse = kalah. Bom yang terpasang ditandai beacon oranye di site.
- **Ekonomi:** mulai $800. Kill +$300, plant +$300, menang ronde +$3250,
  kalah ronde +$1900. Beli di buy phase (15 detik antar ronde): menu beli
  terbuka otomatis, klik baris senjata/granat untuk membeli. Senjata yang
  sudah dimiliki tidak dibayar lagi — klik hanya menggantinya jadi senjata
  aktif. Granat maksimal 2 buah per jenis.

## Senjata & granat
| Senjata | Harga | Sifat |
|---|---|---|
| P9 "Gull" | gratis | semi, 26 dmg, 12/48 peluru, reload 1,1 dtk |
| Breakwater-12 (shotgun) | $1200 | 8 pellet × 13 dmg, headshot x2, 5/20, reload 2,4 dtk, jangkauan 22 m |
| Riptide-9 (SMG) | $1500 | auto, 24 dmg, ~706 tembakan/menit, 28/84, reload 1,5 dtk |
| KR-41 Kestrel (rifle) | $2700 | auto, 34 dmg, 25/75, reload 1,9 dtk, serbaguna |
| Longshoreman-50 (sniper) | $4750 | semi, 95 dmg, 5/15, reload 2,8 dtk, jangkauan 90 m |

Granat: Squall Frag $300 (ledakan radius 7 m, 120 dmg, tombol 3), Fog Flash
$200 (kilatan putih radius 14 m, tombol 4). Squall Frag juga melukai pemain
sendiri bila mendarat dalam 5 m (sampai 60 dmg). Fog Flash hanya efek visual
di layar — tidak membutakan bot.

## Gunplay
Hitscan raycast ke hitbox bot: headshot x4 (shotgun x2), badan x1, kaki
x0.75, plus damage falloff jarak (penuh sampai jarak falloff, lalu turun
linear ke minimum): Gull 18–45 m (min 0,55), Breakwater-12 8–22 m (min 0,3),
Riptide-9 14–35 m (min 0,5), Kestrel 25–60 m (min 0,6), Longshoreman-50
40–90 m (min 0,75). Headshot Gull 104 dmg dan Kestrel 136 dmg membunuh
satu tembakan dari jarak dekat; Riptide-9 headshot 96 dmg tidak.
Spread + recoil (bloom) bertambah tiap tembakan (bloom luruh 1,6/detik);
penalti bergerak (sprint x1,6), jongkok x0,7, di udara x1,8; ADS (klik
kanan, FOV 75 → 53) mengecilkan spread sesuai senjata (Gull 45%,
Breakwater-12 70%, Riptide-9 50%, Kestrel 40%, Longshoreman-50 25% dari
spread normal). Recoil menaikkan bidikan (pitch) tiap tembakan. Reload
**R**, mag + reserve. Tembakan bot bukan hitscan: peluang kena 42% di
jarak nol, berkurang 0,6% per meter (minimal 8%), −8% bila target bergerak,
−5% bila target jongkok; damage 8–14 per tembakan.

## Gerakan & bot
WASD + akselerasi/deselerasi (tanpa berhenti instan), jalan 4,6 m/dtk,
Shift sprint 6,8 m/dtk, Ctrl/C jongkok 2,4 m/dtk (mata 1,08 m vs 1,62 m
berdiri, spread x0,7), Spasi lompat, collision AABB melawan dinding/
kontainer/peti (geser sepanjang dinding, peti rendah bisa dilompati).
Bot AI memakai waypoint graph (20 node): hold site, patrol, investigate
suara tembakan (radius 26 m) / ledakan (30 m) / plant (40 m), engage
(cek line-of-sight sampai 42 m, aim error membesar dengan jarak, burst
3–5 tembakan, strafe), follow (bot teman membuntuti pemain ~4 m), dan
defuse saat bom terpasang (bot Harbour dalam 3,5 m dari site men-defuse
5 detik; dalam 14 m bergerak ke site). Reaction time 0,35–0,6 detik;
target yang hilang dari pandangan 1,6 detik dicari di posisi terakhir
dilihat selama 6 detik. Bot: Marisol, Bram, Kaito, Yusuf (Tidebreakers)
dan Harlan, Petra, Oskar, Nadia, Viktor (Harbour Ward); HP 100,
kecepatan jalan 3,4 m/dtk.

## HUD & audio
Health + bar (hijau >50, kuning >25, merah), ammo mag/reserve, nama
senjata, timer ronde (merah di bawah 15 detik), skor ronde, uang, jumlah
kill, kill feed (maks 5), crosshair dinamis (celah membesar dengan bloom
dan gerakan, mengecil saat ADS), hitmarker (merah saat kill), bar progres
plant/defuse, banner akhir ronde (4 detik), overlay akhir match, menu
awal, prompt kontekstual (mis. fuse bom yang terpasang).
Semua suara disintesis WebAudio (tembakan berbeda per senjata, reload,
langkah, kill chime, hit tick, beep plant, ledakan, flash, stinger
menang/kalah, bunyi beli). **M** mute.

## Map
Quay Lane (sightline panjang tengah di antara baris kontainer), A Lane
(barat, menuju Drydock), B Lane (timur, menuju Warehouse), Mid, Site A
Drydock (crane drydock 14 m sebagai siluet, barat laut) dan Site B
Warehouse (tenggara), masing-masing ditandai pad hazard kuning-hitam
9×9 m. Arena 64×44 m: 10 baris kontainer (satu tumpukan dua tingkat),
8 peti kayu, dinding perimeter 5 m, 6 lampu sodium, cahaya bulan
directional, fog. Spawn Tidebreakers di selatan (z 17–19), Harbour Ward
di utara (z −17–−19). Semua tekstur prosedural dari canvas (beton, lantai,
kontainer bergaris bertuliskan "IRONQUAY" / "TIDE-07", peti, hazard,
dinding); tanpa gambar eksternal.

## Teknologi
- Modul satu tugas: `state` (state terpusat + konstanta), `rng` (mulberry32),
  `map`, `textures`, `audio`, `weapons`, `player`, `bots`, `combat`,
  `rounds`, `hud`, `viewmodel`, `shots`, `main` (bootstrap + loop).
- Simulasi fixed-step 60 Hz terpisah dari render; RNG seeded
  (`?seed=N`) sehingga replay deterministik.
- Screenshot deterministik: `?shot=start|play|buy|end&seed=1` — pose dan
  bot ditentukan seed, lalu frame dibekukan. `main.ts` menyalin `game/` +
  `screenshots/` ke output dan menulis `dossier.json` (maks 4 screenshot,
  masing-masing maks 256 KiB).

## Kontrol
WASD gerak · Mouse bidik · Klik tembak · Klik kanan ADS · R reload ·
Shift sprint · Ctrl/C jongkok · Spasi lompat · E (tahan) pasang bom ·
1/2 ganti senjata · 3/4 granat · M mute. Menu beli terbuka otomatis saat
buy phase — klik baris untuk membeli (tidak ada tombol B di kode; tidak
ada jeda/Esc).
