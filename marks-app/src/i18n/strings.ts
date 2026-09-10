export type Locale = 'ms' | 'en';

/**
 * UI chrome only — buttons, labels, status messages, navigation. The
 * checklist perkara/kategori names (KEDATANGAN, DISPLIN, KEBERSIHAN KEDAI…)
 * are never in here and never will be: they are verbatim from the real paper
 * workbook staff already use, and translating them risks nobody recognising
 * the form they know. See FORM/STOR_FORM/SV_FORM in data/checklist.ts.
 *
 * Keys are grouped loosely by the screen they first appear on, but many are
 * reused across several — Batal, Simpan and Hantar in particular are shared
 * everywhere rather than re-keyed per screen.
 */
export const STRINGS: Record<string, Record<Locale, string>> = {
  // ---------------------------------------------------------------- common
  batal: { ms: 'Batal', en: 'Cancel' },
  simpan: { ms: 'Simpan', en: 'Save' },
  hantar: { ms: 'Hantar', en: 'Send' },
  kembali: { ms: 'Kembali', en: 'Back' },
  faham: { ms: 'Faham', en: 'Got it' },
  isi: { ms: 'Isi', en: 'Fill in' },
  tiada_pemegang: { ms: 'Tiada pemegang', en: 'Nobody in this role' },
  memuatkan: { ms: 'Memuatkan…', en: 'Loading…' },

  // ------------------------------------------------------- sign-out / auth
  log_keluar: { ms: 'Log keluar', en: 'Sign out' },
  tukar_peranan: { ms: 'Tukar peranan', en: 'Switch role' },
  marks_pending_warning: {
    ms: '{count} markah masih menunggu sambungan. Ia kekal dalam telefon ini dan akan dihantar sendiri, walaupun selepas log keluar.',
    en: '{count} scores are still waiting for a connection. They stay on this phone and send on their own, even after signing out.',
  },
  bahasa: { ms: 'Bahasa', en: 'Language' },

  // ------------------------------------------------------------ sign-in
  log_masuk: { ms: 'Log masuk', en: 'Sign in' },
  nombor_pekerja: { ms: 'Nombor pekerja', en: 'Payroll number' },
  kata_laluan: { ms: 'Kata laluan', en: 'Password' },
  sign_in_hint: {
    ms: 'Guna nombor pekerja anda, bukan e-mel. Akaun dibuka oleh admin — hubungi mereka jika belum ada kata laluan.',
    en: 'Use your payroll number, not an email. Accounts are created by admin — contact them if you don’t have a password yet.',
  },
  akaun_domain: { ms: 'domain akaun: {domain}', en: 'account domain: {domain}' },

  // ------------------------------------------------------------ returns row
  bil_tarikh: { ms: 'Bil {date} · {supplier}', en: 'Bill {date} · {supplier}' },
  selesai: { ms: 'SELESAI', en: 'DONE' },
  terbuka: { ms: 'TERBUKA', en: 'OPEN' },
  seterusnya: { ms: 'Seterusnya: {stage}', en: 'Next: {stage}' },
  stok_dilaraskan: { ms: 'Stok sudah dilaraskan', en: 'Stock already adjusted' },
  tindakan_anda: { ms: 'TINDAKAN ANDA', en: 'YOUR ACTION' },

  // ------------------------------------------------------------- photos
  gambar_bukti: { ms: 'Gambar bukti', en: 'Photo evidence' },
  gambar_bukti_hint: {
    ms: 'Ambil gambar barang rosak sebagai bukti untuk pembekal.',
    en: 'Photograph the damaged goods as evidence for the supplier.',
  },
  gambar_bukti_a11y: { ms: 'Gambar bukti pulangan', en: 'Return evidence photo' },
  buang_gambar_a11y: { ms: 'Buang gambar', en: 'Remove photo' },
  buang: { ms: 'Buang', en: 'Remove' },
  ambil_gambar: { ms: 'Ambil gambar', en: 'Take photo' },
  galeri: { ms: 'Galeri', en: 'Gallery' },
  gambar_gagal_naik: { ms: 'Gambar tidak dapat dimuat naik.', en: 'Photo could not be uploaded.' },
  gambar_gagal_buang: { ms: 'Gambar tidak dapat dibuang.', en: 'Photo could not be removed.' },

  // ---------------------------------------------------------- outlet report
  semua_cawangan: { ms: 'Semua cawangan', en: 'All branches' },
  laporan_cawangan: { ms: 'Laporan cawangan', en: 'Branch report' },
  report_period: {
    ms: '{month} · {count} cawangan berdata{quiet}',
    en: '{month} · {count} branches with data{quiet}',
  },
  report_quiet_suffix: {
    ms: ' · {count} lagi belum ada pekerja atau pulangan',
    en: ' · {count} more with no staff or returns yet',
  },
  markah_kedai: { ms: 'Markah kedai', en: 'Shop score' },
  penilaian_pekerja: { ms: '{marked} penilaian · {people} pekerja', en: '{marked} scored · {people} staff' },
  markah_stor_hq: { ms: 'Markah stor · HQ', en: 'Store score · HQ' },
  penilaian_pekerja_stor: {
    ms: '{marked} penilaian · {people} pekerja stor pusat',
    en: '{marked} scored · {people} central store staff',
  },
  belum_dinilai: { ms: 'Belum dinilai', en: 'Not yet scored' },
  daripada_minggu_pekerja: { ms: 'daripada {total} minggu × pekerja', en: 'out of {total} week × staff cells' },
  hantar_ke_kerani: { ms: 'Hantar ke kerani', en: 'Sent to clerk' },
  bil_diterima: { ms: '{count} bil diterima', en: '{count} bills received' },
  bil_melebihi_2_bulan: {
    ms: '{count} bil melebihi 2 bulan merentas semua cawangan',
    en: '{count} bills over 2 months old across every branch',
  },
  ageing_overdue: {
    ms: '{overdue} sudah lepas tempoh seminggu untuk clear. Tertua {days} hari.',
    en: '{overdue} already past the week allowed to clear. Oldest is {days} days.',
  },
  ageing_breach: {
    ms: 'Masih dalam tempoh seminggu untuk clear. Tertua {days} hari.',
    en: 'Still inside the week allowed to clear. Oldest is {days} days.',
  },
  peranan_stor_blind: {
    ms: 'Peranan {role} tidak merangkumi bahagian stor — markah stor dan pulangan tidak dipaparkan.',
    en: 'The {role} role does not cover the stor side — store scores and returns are not shown.',
  },
  ikut_cawangan: { ms: 'Ikut cawangan', en: 'By branch' },
  weakest_summary: {
    ms: '{outlet} paling rendah pada {avg}% markah kedai, {diff} mata di bawah {best}.',
    en: '{outlet} is lowest at {avg}% shop score, {diff} points below {best}.',
  },
  n_pekerja: { ms: '{count} pekerja', en: '{count} staff' },
  tiada_penilaian_bulan_ini: { ms: 'Tiada penilaian direkod bulan ini.', en: 'No scores recorded this month.' },
  kedai: { ms: 'Kedai', en: 'Shop' },
  stor: { ms: 'Stor', en: 'Store' },
  hantar_status: { ms: 'Hantar', en: 'Sent' },
  bil_melebihi_2_bulan_short: {
    ms: '{count} bil melebihi 2 bulan{overdue} · tertua {days} hari',
    en: '{count} bills over 2 months{overdue} · oldest {days} days',
  },
  overdue_suffix: { ms: ', {count} lepas tempoh clear', en: ', {count} past the clear-by date' },
  bil_terbuka_dalam_tempoh: {
    ms: '{count} bil terbuka, semua dalam tempoh 2 bulan.',
    en: '{count} open bills, all within 2 months.',
  },
  bahagian_stor: { ms: 'Bahagian stor', en: 'Stor side' },
  tiada_dalam_bidang: { ms: 'Tiada dalam bidang peranan ini', en: 'Not part of this role' },

  // ------------------------------------------------------------- queue banner
  markah_gagal_simpan: { ms: 'Markah tidak dapat disimpan', en: 'Score could not be saved' },
  markah_ditolak_pelayan: {
    ms: 'Pangkalan data menolak simpanan ini, jadi ia tidak akan dicuba semula sendiri. Markah masih di skrin sahaja.',
    en: 'The database refused this save, so it will not be retried automatically. The score is still on screen only.',
  },
  markah_menunggu: {
    ms: '{count} markah menunggu sambungan. Ia disimpan dalam telefon dan akan dihantar sendiri.',
    en: '{count} scores waiting for a connection. They are saved on this phone and will send on their own.',
  },
  markah_ditolak_orang_lain: { ms: 'Markah {person} tidak dapat dihantar', en: '{person}’s score could not be sent' },
  markah_ditolak_detail: {
    ms: '{week} sudah dinilai oleh orang lain sebelum telefon ini dapat sambungan, jadi markah itu kekal. Nilai semula jika markah anda yang betul.',
    en: '{week} was already scored by someone else before this phone got a connection, so that score stands. Re-score it if yours is the right one.',
  },

  // --------------------------------------------------------------- query thread
  belum_ada_soalan: { ms: 'Belum ada soalan. Tanya di bawah.', en: 'No questions yet. Ask below.' },
  tulis_soalan: { ms: 'Tulis soalan…', en: 'Write a question…' },

  // -------------------------------------------------------------------- done
  markah_dihantar: { ms: 'Markah dihantar', en: 'Score submitted' },
  done_summary: {
    ms: '{name} · {total}/{max} · Minggu {week}. Menunggu pengesahan MANAGER.',
    en: '{name} · {total}/{max} · Week {week}. Waiting on MANAGER sign-off.',
  },
  pekerja_seterusnya: { ms: 'Pekerja seterusnya ({count})', en: 'Next staff member ({count})' },
  semua_pekerja_selesai: { ms: 'Semua pekerja selesai', en: 'Everyone done' },

  // -------------------------------------------------------------- role picker
  sign_in_intro: {
    ms: 'Log masuk dengan nombor pekerja. Apa yang anda nampak ditentukan oleh peranan anda.',
    en: 'Sign in with your payroll number. What you see depends on your role.',
  },
  demo_intro: {
    ms: 'SV/AS dan Area Manager hanya melihat pekerja di cawangan mereka sendiri. Stor pusat di HQ menerima pulangan dari semua cawangan.',
    en: 'SV/AS and Area Manager only see staff at their own branch. The central store at HQ receives returns from every branch.',
  },
  cawangan_count: { ms: 'Cawangan · {count}', en: 'Branches · {count}' },
  paparan_sendiri_machang: {
    ms: 'Paparan sendiri: Machang sahaja',
    en: 'Own self-view only: Machang',
  },
  rekod_contoh_machang: {
    ms: 'Rekod mingguan pekerja masih data contoh Kedai Machang.',
    en: 'Weekly staff records are still Kedai Machang sample data.',
  },
  tiada_pemegang_cawangan: { ms: 'Tiada pemegang di cawangan ini', en: 'Nobody in this role at this branch' },
  stor_pusat_hq: { ms: 'Stor pusat · HQ Jenjarom', en: 'Central store · HQ Jenjarom' },
  ibu_pejabat: { ms: 'Ibu pejabat · semua cawangan', en: 'Head office · every branch' },

  // ------------------------------------------------------------ tab titles
  tab_markah_saya: { ms: 'Markah saya', en: 'My scores' },
  tab_rekod: { ms: 'Rekod', en: 'Record' },
  tab_profil: { ms: 'Profil', en: 'Profile' },
  tab_pekerja: { ms: 'Pekerja', en: 'Staff' },
  tab_soalan: { ms: 'Soalan', en: 'Questions' },
  tab_checklist: { ms: 'Checklist', en: 'Checklist' },
  tab_ringkasan: { ms: 'Ringkasan', en: 'Summary' },
  tab_belum_dinilai: { ms: 'Belum dinilai', en: 'Not scored' },
  tab_aset_kedai: { ms: 'Aset kedai', en: 'Shop assets' },
  tab_checklist_sv: { ms: 'Checklist SV', en: 'SV checklist' },
  tab_tugasan_saya: { ms: 'Tugasan saya', en: 'My tugasan' },
  tab_markah: { ms: 'Markah', en: 'Scores' },
  tab_pulangan: { ms: 'Pulangan', en: 'Returns' },
  tab_admin: { ms: 'Admin', en: 'Admin' },
  tab_cawangan: { ms: 'Cawangan', en: 'Branches' },
  tab_peranan: { ms: 'Peranan', en: 'Roles' },
  tab_pulangan_saya: { ms: 'Pulangan saya', en: 'My returns' },
  tab_selesai: { ms: 'Selesai', en: 'Done' },

  // ---------------------------------------------------------------- staff home
  weakest_this_week: {
    ms: '{name} paling rendah ({value}%) minggu ini.{note}',
    en: '{name} is lowest ({value}%) this week.{note}',
  },
  belum_ada_markah_anda: { ms: 'Belum ada markah direkod untuk anda.', en: 'No score recorded for you yet.' },
  markah_akan_muncul: {
    ms: 'SV/AS akan menilai checklist mingguan anda. Markah akan muncul di sini sebaik ia dihantar.',
    en: 'Your SV/AS will score your weekly checklist. It will appear here as soon as it is submitted.',
  },
  markah_mingguan: { ms: 'Markah mingguan', en: 'Weekly scores' },
  belum_disahkan_manager_a11y: { ms: 'Belum disahkan MANAGER', en: 'Not yet confirmed by MANAGER' },

  // ------------------------------------------------------------------- profil
  penyelia: { ms: 'Penyelia', en: 'Supervisor' },
  tiada_penyelia: { ms: 'Tiada penyelia', en: 'No supervisor' },
  purata_n_minggu: { ms: '% purata {count} minggu', en: '% average of {count} weeks' },

  // -------------------------------------------------------------------- rekod
  rekod_saya: { ms: 'Rekod saya', en: 'My record' },
  belum_ada_minggu_dinilai: { ms: 'Belum ada minggu yang dinilai.', en: 'No weeks scored yet.' },
  n_minggu_terakhir: {
    ms: '{count} minggu terakhir yang sudah dinilai.',
    en: 'The last {count} weeks that were scored.',
  },
  purata_ikut_perkara: { ms: 'Purata ikut perkara · {count} minggu', en: 'Average by item · {count} weeks' },

  // ------------------------------------------------------------- supervisor
  tiada_sv: { ms: 'Tiada SV/AS', en: 'No SV/AS' },
  checklist_minggu: { ms: 'Checklist Minggu {week}', en: 'Week {week} Checklist' },
  checklist_status: {
    ms: 'Tarikh {range}. {pending} daripada {total} pekerja belum dinilai. Tutup sebelum Ahad.',
    en: '{range}. {pending} of {total} staff not yet scored. Close before Sunday.',
  },
  peringatan_am_banner: { ms: '{count} peringatan daripada Area Manager →', en: '{count} reminders from Area Manager →' },
  badge_stor: { ms: 'STOR', en: 'STORE' },
  badge_kedai: { ms: 'KEDAI', en: 'SHOP' },

  rekod_penilaian: { ms: 'Rekod penilaian', en: 'Scoring record' },
  markah_hantar_bulan: { ms: 'Markah yang anda hantar untuk {month}.', en: 'Scores you submitted for {month}.' },
  minggu_n: { ms: 'Minggu {n}', en: 'Week {n}' },
  n_daripada_dinilai: { ms: '{done}/{total} dinilai', en: '{done}/{total} scored' },
  belum_ada_markah_direkod: { ms: 'Belum ada markah direkod.', en: 'No scores recorded.' },

  soalan_peringatan: { ms: 'Soalan & peringatan', en: 'Questions & reminders' },
  soalan_peringatan_intro: {
    ms: 'Peringatan daripada Area Manager, dan soalan pekerja tentang markah mereka.',
    en: 'Reminders from your Area Manager, and staff questions about their scores.',
  },
  peringatan: { ms: 'Peringatan', en: 'Reminders' },
  soalan_pekerja: { ms: 'Soalan pekerja', en: 'Staff questions' },
  tiada_soalan: { ms: 'Tiada soalan buat masa ini.', en: 'No questions right now.' },
  minggu_bulan: { ms: 'Minggu {week} · {month}', en: 'Week {week} · {month}' },
  soalan_thread_label: { ms: 'Soalan · Minggu {week} · {month}', en: 'Question · Week {week} · {month}' },

  pekerja_tab_title: { ms: 'Pekerja', en: 'Staff' },
  pekerja_intro: {
    ms: '{count} pekerja di {branch}. Purata dikira daripada minggu yang sudah dinilai sahaja.',
    en: '{count} staff at {branch}. Average is over weeks already scored only.',
  },
  n_minggu_slash4: { ms: '{count}/4 minggu', en: '{count}/4 weeks' },

  // -------------------------------------------------------------- manager/sv
  checklist_sv_minggu: { ms: 'Checklist SV/AS · Minggu {week}', en: 'SV/AS Checklist · Week {week}' },
  checklist_sv_status: {
    ms: 'Tarikh {range}. {pending} daripada {total} SV/AS belum dinilai.',
    en: '{range}. {pending} of {total} SV/AS not yet scored.',
  },
  tiada_sv_cawangan: { ms: 'Tiada SV/AS di cawangan anda.', en: 'No SV/AS at your branch.' },

  // ---------------------------------------------------------- manager/tugasan
  tugasan_am_label: { ms: '{branch} · Tugasan Area Manager', en: '{branch} · Area Manager Tugasan' },
  pemeriksaan_sendiri_nama: { ms: 'Pemeriksaan sendiri oleh {name}', en: 'Self-check by {name}' },
  pemeriksaan_sendiri_am: {
    ms: 'Pemeriksaan sendiri Area Manager cawangan',
    en: 'The branch Area Manager’s own self-check',
  },
  tugasan_status_suffix: {
    ms: ' — bukan dinilai oleh SV/AS. {done}/{total} semakan selesai bulan ini.',
    en: ' — not scored by SV/AS. {done}/{total} checks done this month.',
  },
  tugasan_readonly_banner: {
    ms: 'Paparan sahaja. Tugasan ini diisi oleh Area Manager cawangan sendiri.',
    en: 'View only. This tugasan is filled in by the branch’s own Area Manager.',
  },
  catatan_rm: { ms: 'Catatan (RM)', en: 'Note (RM)' },
  catatan: { ms: 'Catatan', en: 'Note' },
  contoh_rm: { ms: 'cth: RM4,000', en: 'e.g. RM4,000' },
  contoh_sales_ok: { ms: 'cth: SALES OK', en: 'e.g. SALES OK' },
  tarikh_pemeriksaan: { ms: 'Tarikh pemeriksaan', en: 'Inspection date' },
  pengesahan_mingguan: { ms: 'Pengesahan mingguan', en: 'Weekly sign-off' },
  diisikan_oleh: { ms: 'Diisikan oleh', en: 'Filled by' },
  diperiksa_oleh: { ms: 'Diperiksa oleh', en: 'Checked by' },
  tarikh: { ms: 'Tarikh', en: 'Date' },
  tugasan_signoff_hint: {
    ms: 'Diisikan oleh diisi automatik apabila tugasan minggu itu ditanda. Diperiksa oleh kekal kosong sehingga disahkan — sama seperti lajur MANAGER pada checklist lain.',
    en: 'Filled by is set automatically when that week’s tugasan is ticked. Checked by stays blank until confirmed — the same as the MANAGER column on the other checklists.',
  },

  // ------------------------------------------------------------- manager home
  tiada_area_manager: { ms: 'Tiada Area Manager', en: 'No Area Manager' },
  purata_sv: { ms: 'Purata SV/AS', en: 'SV/AS average' },
  n_penilaian_direkod: { ms: '{count} penilaian direkod', en: '{count} scores recorded' },
  minggu_x_pekerja: { ms: 'minggu × pekerja', en: 'week × staff' },
  hijau_disahkan_mgr: { ms: 'hijau = disahkan MGR', en: 'green = MGR confirmed' },
  peratus_mingguan: { ms: '% mingguan', en: '% weekly' },
  cohort_kedai: { ms: 'Pekerja Kedai', en: 'Shop Staff' },
  cohort_stor: { ms: 'Pekerja Stor', en: 'Store Staff' },
  cohort_sv: { ms: 'SV / AS', en: 'SV / AS' },
  cell_a11y_unmarked: { ms: '{name} minggu {week}: belum dinilai', en: '{name} week {week}: not yet scored' },
  cell_a11y_marked: { ms: '{name} minggu {week}: {value} peratus', en: '{name} week {week}: {value} percent' },
  markah_ikut_perkara: { ms: 'Markah ikut perkara', en: 'Score by item' },
  lowest_perkara_summary: {
    ms: '{item} perkara paling rendah bagi {count} {cohort}.',
    en: '{item} is the lowest item for {count} {cohort}.',
  },
  checklist_sv_banner: {
    ms: 'Checklist SV/AS: {pending}/{total} belum dinilai →',
    en: 'SV/AS Checklist: {pending}/{total} not yet scored →',
  },
  checklist_kedai_banner: {
    ms: 'Checklist Kedai: {count} aset belum selesai, tertua {days} hari →',
    en: 'Shop Checklist: {count} assets unresolved, oldest {days} days →',
  },
  tugasan_am_banner: {
    ms: 'Tugasan Area Manager: {done}/{total} semakan mingguan selesai →',
    en: 'Area Manager Tugasan: {done}/{total} weekly checks done →',
  },
  menjana_fail: { ms: 'Menjana fail…', en: 'Generating file…' },
  export_month_xlsx: { ms: 'Export {month} (XLSX)', en: 'Export {month} (XLSX)' },
  fail_sedia_tiada_kongsi: { ms: 'Fail sedia, tiada cara berkongsi', en: 'File ready, no way to share it' },
  fail_sedia_detail: {
    ms: '{filename} berjaya dijana dan disimpan pada telefon, tetapi tiada aplikasi didapati untuk berkongsinya.\n\n{uri}',
    en: '{filename} was generated and saved on this phone, but no app was found to share it with.\n\n{uri}',
  },
  eksport_gagal: { ms: 'Eksport gagal', en: 'Export failed' },
  cuba_lagi_sebentar: { ms: 'Cuba lagi sebentar.', en: 'Try again shortly.' },

  // ---------------------------------------------------------------------- gaps
  gaps_intro: {
    ms: '{gaps} daripada {total} kotak minggu × pekerja masih kosong. Ini yang jadi #DIV/0! dalam fail Excel.',
    en: '{gaps} of {total} week × staff cells are still empty. This is what became #DIV/0! in the Excel file.',
  },
  semua_kotak_diisi: { ms: 'Semua kotak sudah diisi bulan ini.', en: 'Every cell is filled in this month.' },
  minggu_list: { ms: 'minggu {list}', en: 'week {list}' },
  menghantar: { ms: 'Menghantar…', en: 'Sending…' },
  hantar_peringatan_sv: { ms: 'Hantar peringatan ke SV/AS', en: 'Send reminder to SV/AS' },
  sv_terima_peringatan: {
    ms: '{count} SV/AS menerima peringatan dalam apl.',
    en: '{count} SV/AS received the in-app reminder.',
  },

  // -------------------------------------------------------------------- assets
  keadaan_aset_kedai: { ms: 'Keadaan aset kedai', en: 'Shop asset status' },
  aset_dikemaskini: {
    ms: '{branch} · dikemaskini oleh {name} · pemeriksaan mingguan',
    en: '{branch} · updated by {name} · weekly check',
  },
  belum_selesai: { ms: 'BELUM SELESAI', en: 'UNRESOLVED' },
  ok_status: { ms: 'OK', en: 'OK' },
  hari_terbuka: { ms: '{days} hari terbuka', en: '{days} days open' },
  tanda_selesai: { ms: 'Tanda selesai', en: 'Mark resolved' },
  laporkan_isu: { ms: 'Laporkan isu', en: 'Report an issue' },
  terangkan_isu: { ms: 'Terangkan isu ini…', en: 'Describe the issue…' },

  // -------------------------------------------------------------------- hq/hr
  tab_laporan: { ms: 'Laporan', en: 'Report' },
  log_masuk_manager: {
    ms: 'Log masuk sebagai Manager atau General Manager untuk melihat laporan cawangan.',
    en: 'Sign in as Manager or General Manager to see the branch report.',
  },
  log_masuk_hr: {
    ms: 'Log masuk sebagai Human Resources untuk melihat laporan cawangan.',
    en: 'Sign in as Human Resources to see the branch report.',
  },

  // ---------------------------------------------------------------- hr/markah
  markah_pekerja: { ms: 'Markah pekerja', en: 'Staff scores' },
  markah_pekerja_intro: {
    ms: '{month} · paparan sahaja, penilaian dibuat oleh SV/AS.',
    en: '{month} · view only, scored by SV/AS.',
  },
  kpi_stor_semua_cawangan: { ms: 'KPI pekerja stor · semua cawangan', en: 'Store staff KPI · every branch' },
  kpi_stor_summary: {
    ms: '{marked} penilaian daripada {total} minggu × pekerja · {gaps} belum dinilai',
    en: '{marked} scored out of {total} week × staff cells · {gaps} not yet scored',
  },
  rekod_nama_a11y: { ms: 'Rekod {name}', en: '{name}’s record' },

  // -------------------------------------------------------------- hr/pulangan
  semua_cawangan_hr: { ms: 'Semua cawangan · Human Resources', en: 'Every branch · Human Resources' },
  umur_pulangan: { ms: 'Umur pulangan', en: 'Return ageing' },
  umur_pulangan_intro: {
    ms: 'Masa terima → pelarasan stok merentas semua cawangan. Area Manager tidak melihat laporan ini — skop mereka outlet sahaja.',
    en: 'Time from received to stock adjustment, across every branch. Area Managers do not see this report — their scope is outlet only.',
  },
  purata_clear: { ms: 'Purata clear', en: 'Average clear time' },
  hari: { ms: 'hari', en: 'days' },
  n_bil_selesai: { ms: '{count} bil selesai', en: '{count} bills cleared' },
  masih_terbuka: { ms: 'Masih terbuka', en: 'Still open' },
  bil: { ms: 'bil', en: 'bills' },
  tertua_n_hari: { ms: 'tertua {days} hari', en: 'oldest {days} days' },
  umur_bil_terbuka: { ms: 'Umur bil terbuka', en: 'Age of open bills' },
  bil_dalam_kategori: {
    ms: '{count} bil sudah dalam kategori {bucket}.',
    en: '{count} bills are already in the {bucket} band.',
  },
  masa_setiap_langkah: { ms: 'Masa setiap langkah', en: 'Time per step' },
  langkah_paling_lambat: {
    ms: 'Langkah paling lambat: {from} → {to}, purata {avg} hari.',
    en: 'Slowest step: {from} → {to}, averaging {avg} days.',
  },
  col_cawangan: { ms: 'Cawangan', en: 'Branch' },
  col_buka: { ms: 'Buka', en: 'Open' },
  col_purata: { ms: 'Purata', en: 'Average' },
  col_tertua: { ms: 'Tertua', en: 'Oldest' },
  tiada_rekod_pulangan: { ms: 'Tiada rekod pulangan.', en: 'No return records.' },
  paling_lama_terbuka: { ms: 'Paling lama terbuka', en: 'Open the longest' },

  // --------------------------------------------------------------- admin/users
  tab_pengguna: { ms: 'Pengguna', en: 'Users' },
  semua_cawangan_admin: { ms: 'Semua cawangan · Pentadbiran', en: 'Every branch · Administration' },
  tambah_pengguna_a11y: { ms: 'Tambah pengguna', en: 'Add user' },
  tambah: { ms: '+ Tambah', en: '+ Add' },
  akaun_aktif_summary: {
    ms: '{active} akaun aktif{inactive}. Tukar peranan untuk naik atau turun pangkat.',
    en: '{active} active accounts{inactive}. Change role to promote or demote.',
  },
  inactive_suffix: { ms: ' · {count} nyahaktif', en: ' · {count} deactivated' },
  semua: { ms: 'Semua', en: 'All' },
  nyahaktif_suffix: { ms: ' · nyahaktif', en: ' · deactivated' },

  // ------------------------------------------------------------ admin/cawangan
  pentadbiran: { ms: 'Pentadbiran', en: 'Administration' },
  tambah_cawangan_a11y: { ms: 'Tambah cawangan', en: 'Add branch' },
  cawangan_intro: {
    ms: 'Setiap akaun dipos ke satu cawangan. SV/AS dan Area Manager hanya melihat pekerja di cawangan mereka.',
    en: 'Every account is posted to one branch. SV/AS and Area Manager only see staff at their own branch.',
  },
  stat_pekerja: { ms: 'Pekerja', en: 'Staff' },
  stat_area_mgr: { ms: 'Area Mgr', en: 'Area Mgr' },
  cawangan_ditutup: {
    ms: 'Ditutup — tidak boleh dipilih untuk akaun baharu.',
    en: 'Closed — cannot be chosen for a new account.',
  },
  tiada_am_cawangan: { ms: 'Tiada Area Manager di cawangan ini.', en: 'No Area Manager at this branch.' },
  tiada_cawangan: { ms: 'Tiada cawangan', en: 'No branch' },
  akaun_tiada_cawangan: {
    ms: '{count} akaun belum dipos ke mana-mana cawangan, jadi tiada SV/AS atau manager nampak mereka.',
    en: '{count} accounts are not posted to any branch, so no SV/AS or manager can see them.',
  },

  // -------------------------------------------------------------- admin/peranan
  peranan_intro: {
    ms: 'Siapa memegang apa. Area Manager dan Admin tidak boleh dikosongkan.',
    en: 'Who holds what. Area Manager and Admin can never be left empty.',
  },
  tiada_pemegang_aktif: { ms: 'Tiada pemegang aktif.', en: 'No active holder.' },
  rekod_tukar_pangkat: { ms: 'Rekod tukar pangkat', en: 'Role change record' },
  belum_ada_tukar_pangkat: {
    ms: 'Belum ada kenaikan atau penurunan pangkat direkod sesi ini.',
    en: 'No promotion or demotion recorded this session.',
  },
  naik: { ms: 'NAIK', en: 'UP' },
  turun: { ms: 'TURUN', en: 'DOWN' },

  // ----------------------------------------------------------- pulangan/index
  tab_aktif: { ms: 'Aktif', en: 'Active' },
  tab_kpi_saya: { ms: 'KPI saya', en: 'My KPI' },
  rekod_bil_a11y: { ms: 'Rekod bil pulangan', en: 'Record a return bill' },
  tambah_bil: { ms: '+ Bil', en: '+ Bill' },
  before_friday_stat: { ms: '{onTime}/{received} sebelum Jumaat', en: '{onTime}/{received} before Friday' },
  lebih_2_bulan: { ms: 'Lebih 2 bulan', en: 'Over 2 months' },
  n_bil_melebihi: { ms: '{count} bil melebihi 2 bulan', en: '{count} bills over 2 months' },
  aged_overdue_detail: {
    ms: '{count} sudah lepas tempoh seminggu untuk clear. Kerani dan pekerja stor kena selesaikan bersama.',
    en: '{count} are already past the week allowed to clear. The clerk and store staff need to resolve these together.',
  },
  aged_breach_detail: {
    ms: 'Kena clear dalam seminggu dari tarikh cukup 2 bulan.',
    en: 'Must clear within a week of turning 2 months old.',
  },
  banding_sistem_stok: { ms: 'Banding sistem stok', en: 'Compare with stock system' },
  export_csv: { ms: 'Export CSV', en: 'Export CSV' },
  tindakan_anda_count: { ms: 'Tindakan anda · {count}', en: 'Your action · {count}' },
  tiada_bil_tindakan: { ms: 'Tiada bil menunggu tindakan anda.', en: 'No bills waiting on your action.' },
  menunggu_pihak_lain: { ms: 'Menunggu pihak lain · {count}', en: 'Waiting on someone else · {count}' },

  // ------------------------------------------------------------- pulangan/saya
  skrin_stor_kerani: {
    ms: 'Skrin ini untuk pekerja stor dan kerani stor.',
    en: 'This screen is for store staff and store clerks.',
  },
  dinilai_checklist_dan_pulangan: {
    ms: 'Anda dinilai atas checklist mingguan dan atas pulangan yang anda uruskan.',
    en: 'You are scored on the weekly checklist and on the returns you handle.',
  },
  dinilai_pulangan_sahaja: {
    ms: 'Anda dinilai atas pulangan yang anda uruskan — tiada checklist mingguan.',
    en: 'You are scored on the returns you handle — no weekly checklist.',
  },
  pulangan_bahagian_anda: { ms: 'Pulangan · bahagian anda', en: 'Returns · your part' },
  menunggu_anda: { ms: 'Menunggu anda', en: 'Waiting on you' },
  n_sudah_2_bulan: { ms: '{count} sudah lebih 2 bulan', en: '{count} already over 2 months' },
  tiada_tertunggak: { ms: 'tiada tertunggak', en: 'none outstanding' },
  purata_tindakan: { ms: 'Purata tindakan', en: 'Average action time' },
  n_langkah_direkod: { ms: '{count} langkah direkod', en: '{count} steps recorded' },
  hantar_senarai_kerani: { ms: 'Hantar senarai ke kerani', en: 'Send list to clerk' },
  tak_hantar_suffix: { ms: ' · {count} tak hantar', en: ' · {count} not sent' },
  masa_langkah_anda: { ms: 'Masa setiap langkah anda', en: 'Your time per step' },
  selepas_stage_n: { ms: 'selepas {stage} · n={n}', en: 'after {stage} · n={n}' },
  tarikh_tak_tertib: { ms: 'tarikh tak tertib', en: 'dates out of order' },
  checklist_mingguan_label: { ms: 'Checklist mingguan', en: 'Weekly checklist' },
  n_minggu_direkod: { ms: '{count} minggu direkod', en: '{count} weeks recorded' },
  disahkan_mgr_suffix: { ms: ' · disahkan MGR', en: ' · MGR confirmed' },
  belum_disahkan_suffix: { ms: ' · belum disahkan', en: ' · not yet confirmed' },
  belum_ada_markah_checklist: {
    ms: 'Belum ada markah checklist direkod untuk anda.',
    en: 'No checklist score recorded for you yet.',
  },

  // ----------------------------------------------------------- pulangan/selesai
  selesai_intro: {
    ms: 'Bil yang sudah sampai pelarasan stok. Masa dikira dari terima hingga clear.',
    en: 'Bills that have reached stock adjustment. Time is measured from receipt to clear.',
  },
  purata_terima_clear: { ms: 'Purata terima → clear', en: 'Average received → clear' },
  hari_bil_count: { ms: 'hari · {count} bil', en: 'days · {count} bills' },
  pungutan_pembekal_avg: {
    ms: 'Pungutan pembekal ambil purata {days} hari dari panggilan.',
    en: 'Supplier pickup takes an average of {days} days from the call.',
  },
  belum_ada_bil_selesai: { ms: 'Belum ada bil yang selesai.', en: 'No bills cleared yet.' },

  // ------------------------------------------------------------- pulangan-new
  bil_pulangan_baharu: { ms: 'Bil pulangan baharu', en: 'New return bill' },
  pulangan_new_intro: {
    ms: 'Tarikh terima direkod sebagai hari ini — dari sini masa terima → clear mula dikira.',
    en: 'Received date is recorded as today — this is where received → clear time starts counting.',
  },
  recon_prefill_note: {
    ms: 'Butiran diisi dari export sistem stok{reasonNote}. Semak sebelum rekod.',
    en: 'Details filled from the stock system export{reasonNote}. Check before recording.',
  },
  recon_reason_note: {
    ms: ', kecuali sebab — jenis bil itu bukan rosak atau luput, jadi pilih sendiri',
    en: ', except the reason — this bill type is neither damage nor expired, so choose it yourself',
  },
  cawangan_hantar: { ms: 'Cawangan hantar', en: 'Sending branch' },
  cari_cawangan_kod: { ms: 'Cari cawangan atau kod…', en: 'Search branch or code…' },
  n_lagi_taip_tapis: { ms: '{count} lagi — taip untuk tapis.', en: '{count} more — type to filter.' },
  no_bil: { ms: 'No. bil', en: 'Bill no.' },
  contoh_bill_no: { ms: 'cth: BR-8951', en: 'e.g. BR-8951' },
  tarikh_bil: { ms: 'Tarikh bil', en: 'Bill date' },
  catatan_bil: { ms: 'Catatan bil', en: 'Bill note' },
  butiran_barang_kuantiti: { ms: 'Butiran barang, kuantiti…', en: 'Item details, quantity…' },
  pembekal: { ms: 'Pembekal', en: 'Supplier' },
  contoh_pembekal: { ms: 'cth: Gardenia Bakeries', en: 'e.g. Gardenia Bakeries' },
  rekod_terima: { ms: 'Rekod terima', en: 'Record receipt' },
  pilih_cawangan_hantar: { ms: 'Pilih cawangan yang hantar barang.', en: 'Choose the branch that sent the goods.' },

  // ------------------------------------------------------------- pulangan-csv
  csv_intro: {
    ms: 'Sistem stok tiada API, jadi senarai ini keluar sebagai CSV. Untuk padanan automatik, guna Banding sistem stok — tampal export mereka dan app akan tunjuk bil yang ada di satu sistem sahaja.',
    en: 'The stock system has no API, so this list exports as CSV. For automatic matching, use Compare with stock system — paste their export and the app shows bills that exist in only one system.',
  },
  figure_baris: { ms: 'baris', en: 'rows' },
  figure_ikut_masa: { ms: 'ikut masa', en: 'on time' },
  figure_lewat: { ms: 'lewat', en: 'late' },
  figure_tak_hantar: { ms: 'tak hantar', en: 'not sent' },
  disalin: { ms: 'Disalin', en: 'Copied' },
  salin_csv: { ms: 'Salin CSV', en: 'Copy CSV' },
  pratonton: { ms: 'Pratonton', en: 'Preview' },

  // ----------------------------------------------------------- pulangan-recon
  recon_intro: {
    ms: 'Tampal export CSV dari sistem stok. Aplikasi akan padankan ikut no. bil dan tunjuk bil yang ada di satu sistem sahaja.',
    en: 'Paste the CSV export from the stock system. The app matches by bill number and shows bills that exist in only one system.',
  },
  tampal_clipboard: { ms: 'Tampal dari clipboard', en: 'Paste from clipboard' },
  kosongkan: { ms: 'Kosongkan', en: 'Clear' },
  tampal_terus: { ms: 'atau tampal terus di sini…', en: 'or paste directly here…' },
  padanan_lajur: { ms: 'Padanan lajur', en: 'Column mapping' },
  baris_1_tajuk: { ms: 'Baris 1 = tajuk', en: 'Row 1 = header' },
  tiada_tajuk: { ms: 'Tiada tajuk', en: 'No header' },
  recon_mapping_hint: {
    ms: 'Susunan lajur sistem stok belum disahkan, jadi tekan untuk betulkan jika teka salah. No. bil wajib.',
    en: 'The stock system’s column order is unconfirmed, so tap to correct it if the guess is wrong. Bill no. is required.',
  },
  pilih_lajur_bil_dulu: {
    ms: 'Pilih lajur no. bil dahulu — padanan dibuat ikut nombor bil sahaja.',
    en: 'Choose the bill no. column first — matching is done by bill number only.',
  },
  kod_lokasi_fail: { ms: 'Kod lokasi dalam fail', en: 'Location codes in the file' },
  kod_lokasi_hint: {
    ms: 'Kod sistem stok sama dengan kod cawangan app. Matikan kod yang bukan untuk semakan ini.',
    en: 'The stock system’s codes match the app’s branch codes. Turn off codes that are not part of this check.',
  },
  stat_padan: { ms: 'padan', en: 'matched' },
  stat_app_sahaja: { ms: 'app sahaja', en: 'app only' },
  stat_stok_sahaja: { ms: 'stok sahaja', en: 'stock only' },
  duplicates_note: { ms: '{count} no. bil berulang dalam fail. ', en: '{count} bill numbers repeat in the file. ' },
  unparsed_dates_note: {
    ms: '{count} tarikh tak dapat dibaca — tarikh tidak dibanding untuk baris itu.',
    en: '{count} dates could not be read — dates are not compared for that row.',
  },
  unknown_types_note: {
    ms: '{count} bil berjenis bukan rosak atau luput (cth. GOOD STOCK RETURN). App ini hanya model dua sebab itu, jadi sebabnya kena dipilih sendiri semasa merekod.',
    en: '{count} bills are a type that is neither damage nor expired (e.g. GOOD STOCK RETURN). This app only models those two reasons, so the reason has to be chosen by hand when recording.',
  },
  section_vendor_only_title: { ms: 'Hanya dalam sistem stok', en: 'Only in the stock system' },
  section_vendor_only_empty: { ms: 'Setiap bil dalam fail ada dalam app.', en: 'Every bill in the file exists in the app.' },
  section_vendor_only_note: {
    ms: 'Bil ini belum direkod di sini, jadi ia tiada dalam KPI langsung.',
    en: 'These bills are not recorded here yet, so they are not in the KPI at all.',
  },
  section_app_only_title: { ms: 'Hanya dalam app', en: 'Only in the app' },
  section_app_only_empty: { ms: 'Setiap bil app ada dalam fail sistem stok.', en: 'Every bill in the app exists in the stock system file.' },
  section_app_only_note: {
    ms: 'Bil ini direkod di sini tetapi tiada dalam export — semak sama ada pelarasan stok sudah dibuat.',
    en: 'These bills are recorded here but not in the export — check whether the stock adjustment has been done.',
  },
  section_mismatch_title: { ms: 'Padan tapi butiran beza', en: 'Matched but details differ' },
  section_mismatch_empty: { ms: 'Tarikh dan pembekal sepadan untuk semua bil yang dipadankan.', en: 'Date and supplier match for every bill that matched.' },
  section_mismatch_note: { ms: 'No. bil sama, tetapi satu sistem menyimpan butiran lain.', en: 'Same bill number, but one system holds different details.' },
  tarikh_dash: { ms: 'tarikh —', en: 'date —' },
  sebab_tak_dimodel: { ms: ' · sebab tak dimodel', en: ' · reason not modelled' },
  baris_n: { ms: 'baris {n}', en: 'row {n}' },
  rekod_bil_no_a11y: { ms: 'Rekod bil {billNo}', en: 'Record bill {billNo}' },
  rekod: { ms: 'Rekod', en: 'Record' },
  status_terbuka: { ms: 'terbuka', en: 'open' },
  status_lewat: { ms: 'lewat', en: 'late' },
  status_selesai: { ms: 'selesai', en: 'done' },
  sebab: { ms: 'Sebab', en: 'Reason' },
  clash_app: { ms: '{label} · app', en: '{label} · app' },
  clash_vendor: { ms: '{label} · stok', en: '{label} · stock' },
  lajur_n: { ms: 'Lajur {n}', en: 'Column {n}' },

  // ------------------------------------------------------------------- mark
  pekerja_tak_dijumpai: { ms: 'Pekerja tidak dijumpai', en: 'Staff member not found' },
  akaun_tiada_senarai: { ms: 'Akaun {id} tiada dalam senarai pengguna.', en: 'Account {id} is not in the user list.' },
  minggu_skala: { ms: 'Minggu {week} · skala 1–{max}', en: 'Week {week} · scale 1–{max}' },
  na_dibenarkan_suffix: { ms: ' · N/A dibenarkan', en: ' · N/A allowed' },
  form_perkara_count: { ms: '{form} · {count} perkara', en: '{form} · {count} items' },
  perkara_a11y: { ms: '{label}: {value}', en: '{label}: {value}' },
  perkara_na_a11y: { ms: '{label}: tidak berkenaan', en: '{label}: not applicable' },
  semua_n: { ms: 'Semua {value}', en: 'All {value}' },
  tulis_pilih_catatan: { ms: 'Tulis atau pilih catatan…', en: 'Write or pick a note…' },
  jumlah_markah: { ms: 'Jumlah markah', en: 'Total score' },
  hantar_markah: { ms: 'Hantar markah', en: 'Submit score' },
  n_perkara_diisi: { ms: '{filled}/{total} perkara diisi', en: '{filled}/{total} items filled' },

  // ------------------------------------------------------------------ person
  pekerja_kedai_label: { ms: 'Pekerja kedai', en: 'Shop staff' },
  status_diselaraskan: { ms: 'Dinilai SV/AS · diselaraskan MGR', en: 'Scored by SV/AS · adjusted by MGR' },
  status_disahkan: { ms: 'Dinilai SV/AS · disahkan MGR', en: 'Scored by SV/AS · confirmed by MGR' },
  status_belum_disahkan: { ms: 'Dinilai SV/AS · belum disahkan', en: 'Scored by SV/AS · not yet confirmed' },
  markah_asal_sv: { ms: 'Markah asal SV/AS: {value}%', en: 'Original SV/AS score: {value}%' },
  sahkan_markah: { ms: 'Sahkan markah', en: 'Confirm score' },
  ubah: { ms: 'Ubah', en: 'Adjust' },
  peratus_baharu_minggu: { ms: 'Peratus baharu untuk Minggu {week} ({name})', en: 'New percentage for Week {week} ({name})' },
  simpan_pelarasan: { ms: 'Simpan pelarasan', en: 'Save adjustment' },
  purata_ikut_perkara_bulan: { ms: 'Purata ikut perkara · {month}', en: 'Average by item · {month}' },

  // -------------------------------------------------------------------- week
  markah_tak_dijumpai: { ms: 'Markah tidak dijumpai', en: 'Score not found' },
  buka_semula_senarai: { ms: 'Buka semula dari senarai markah mingguan.', en: 'Reopen from the weekly scores list.' },
  dinilai_oleh_checklist: { ms: 'Dinilai oleh {name} ({id}) · checklist mingguan', en: 'Scored by {name} ({id}) · weekly checklist' },
  diselaraskan_am_detail: {
    ms: 'Diselaraskan oleh Area Manager. Markah asal SV/AS: {value}%.',
    en: 'Adjusted by Area Manager. Original SV/AS score: {value}%.',
  },
  terima: { ms: 'Terima', en: 'Accept' },
  soalan_week_label: { ms: 'Soalan · {label}', en: 'Question · {label}' },
  tanya_sv: { ms: 'Tanya SV', en: 'Ask SV' },
  soalan_markah_fallback: { ms: 'Soalan markah', en: 'Score question' },
  dengan_nama: { ms: 'Dengan {name}', en: 'With {name}' },

  // -------------------------------------------------------------------- bil
  bil_tak_dijumpai: { ms: 'Bil tidak dijumpai', en: 'Bill not found' },
  bukan_tindakan_anda: { ms: 'Bukan tindakan anda', en: 'Not your action' },
  stage_direkod_oleh: { ms: '{stage} direkod oleh {role}.', en: '{stage} is recorded by {role}.' },
  bil_outlet: { ms: 'Bil {date} · {outlet}', en: 'Bill {date} · {outlet}' },
  terima_clear: { ms: 'Terima → clear', en: 'Received → clear' },
  masih_berjalan_suffix: { ms: ' · masih berjalan', en: ' · still running' },
  pembekal_colon: { ms: 'Pembekal: {name}', en: 'Supplier: {name}' },
  asingkan_tentukan: { ms: 'Asingkan — tentukan tindakan', en: 'Separate — decide action' },
  asingkan_intro: {
    ms: 'Pulang ke pembekal atau buang? Pilihan ini menentukan langkah seterusnya.',
    en: 'Return to supplier or discard? This choice decides the next step.',
  },
  pengasingan_bukan_anda: { ms: 'Pengasingan direkod oleh Pekerja Stor.', en: 'Separation is recorded by Store Staff.' },
  tindakan_label: { ms: 'Tindakan', en: 'Action' },
  jejak_masa: { ms: 'Jejak masa', en: 'Time trail' },
  menunggu_role: { ms: 'Menunggu {role}', en: 'Waiting on {role}' },
  rekod_stage: { ms: 'Rekod: {stage}', en: 'Record: {stage}' },
  selesai_stok_dilaraskan: { ms: 'Selesai — stok dilaraskan {date}', en: 'Done — stock adjusted {date}' },
  batalkan_stage: { ms: 'Batalkan: {stage}', en: 'Undo: {stage}' },

  // ------------------------------------------------------------------ branch
  cawangan_tak_dijumpai: { ms: 'Cawangan tidak dijumpai', en: 'Branch not found' },
  nama_kedai: { ms: 'Nama kedai', en: 'Shop name' },
  nama_pendek: { ms: 'Nama pendek', en: 'Short name' },
  simpan_nama: { ms: 'Simpan nama', en: 'Save name' },
  akaun_di_cawangan: { ms: 'Akaun di cawangan ini · {count}', en: 'Accounts at this branch · {count}' },
  belum_ada_akaun_pos: { ms: 'Belum ada akaun dipos ke sini.', en: 'No account posted here yet.' },
  tutup_cawangan: { ms: 'Tutup cawangan', en: 'Close branch' },
  buka_semula_cawangan: { ms: 'Buka semula cawangan', en: 'Reopen branch' },
  tak_boleh_tutup_cawangan: { ms: 'Tidak boleh tutup cawangan', en: 'Cannot close branch' },

  cawangan_baharu: { ms: 'Cawangan baharu', en: 'New branch' },
  cawangan_baharu_intro: {
    ms: 'Kod cawangan muncul di sebelah no. pekerja dan tidak boleh diubah selepas dicipta.',
    en: 'The branch code appears next to the payroll number and cannot change once created.',
  },
  contoh_kedai_pasir_mas: { ms: 'cth: Kedai Pasir Mas', en: 'e.g. Kedai Pasir Mas' },
  contoh_pasir_mas: { ms: 'cth: Pasir Mas', en: 'e.g. Pasir Mas' },
  short_name_hint: { ms: 'Digunakan pada butang pilih cawangan.', en: 'Used on the branch-picker button.' },
  kod_cawangan: { ms: 'Kod cawangan', en: 'Branch code' },
  contoh_pms: { ms: 'cth: PMS', en: 'e.g. PMS' },
  biarkan_kosong_guna: { ms: 'Biarkan kosong untuk guna {code}.', en: 'Leave blank to use {code}.' },
  cipta_cawangan: { ms: 'Cipta cawangan', en: 'Create branch' },

  // ----------------------------------------------------------------- user/[id]
  akaun_tidak_dijumpai: { ms: 'Akaun tidak dijumpai', en: 'Account not found' },
  akaun_tiada_senarai_pengguna: {
    ms: 'Akaun {id} tiada dalam senarai pengguna.',
    en: 'Account {id} is not in the user list.',
  },
  kini_badge: { ms: 'KINI', en: 'NOW' },
  naik_ke: { ms: 'Naik ke {role}', en: 'Promote to {role}' },
  turun_ke: { ms: 'Turun ke {role}', en: 'Demote to {role}' },
  tukar_ke: { ms: 'Tukar ke {role}', en: 'Transfer to {role}' },
  lihat_rekod_penuh: { ms: 'Lihat rekod penuh', en: 'View full record' },
  role_tidak_dinilai: {
    ms: '{role} tidak dinilai atas checklist mingguan.',
    en: '{role} is not scored on the weekly checklist.',
  },
  rekod_lama_pekerja: {
    ms: ' Rekod lama sebagai pekerja ({count} minggu) kekal disimpan.',
    en: ' Past records as staff ({count} weeks) remain saved.',
  },
  nyahaktifkan_akaun: { ms: 'Nyahaktifkan akaun', en: 'Deactivate account' },
  aktifkan_semula_akaun: { ms: 'Aktifkan semula akaun', en: 'Reactivate account' },
  tak_boleh_tukar_peranan: { ms: 'Tidak boleh tukar peranan', en: 'Cannot change role' },
  tak_boleh_tukar_cawangan: { ms: 'Tidak boleh tukar cawangan', en: 'Cannot change branch' },
  tak_boleh_nyahaktif: { ms: 'Tidak boleh nyahaktif', en: 'Cannot deactivate' },

  // ---------------------------------------------------------------- user-new
  akaun_baharu: { ms: 'Akaun baharu', en: 'New account' },
  akaun_baharu_intro: {
    ms: 'No. pekerja dijana ikut siri peranan — KP untuk pekerja kedai, WS untuk SV/AS.',
    en: 'The payroll number is generated by role series — KP for store staff, WS for SV/AS.',
  },
  nama_penuh: { ms: 'Nama penuh', en: 'Full name' },
  contoh_nama_penuh: { ms: 'cth: Nurul Ain binti Rahim', en: 'e.g. Nurul Ain binti Rahim' },
  cawangan_hint_sv: {
    ms: 'SV/AS dan Area Manager hanya nampak pekerja di cawangan ini.',
    en: 'SV/AS and Area Manager only see staff at this branch.',
  },
  no_pekerja: { ms: 'No. pekerja', en: 'Payroll number' },
  biarkan_kosong_guna_id: { ms: 'Biarkan kosong untuk guna {id}.', en: 'Leave blank to use {id}.' },
  cipta_akaun_role: { ms: 'Cipta akaun {role}', en: 'Create {role} account' },
};

/**
 * Looks up one string, filling {placeholder} tokens from `params` where the
 * entry has them. Missing keys fall back to the key itself, loudly, so a
 * forgotten translation is a visible English-looking string in dev rather
 * than a silent blank.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const entry = STRINGS[key];
  if (!entry) {
    console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  let text = entry[locale];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
