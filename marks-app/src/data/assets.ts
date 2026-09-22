export type NoteChip = { key: string; label: string; text: string };

export const NOTE_CHIPS: NoteChip[] = [
  {
    key: 'tandas',
    label: 'Tandas belum dibersihkan',
    text: 'Tandas belum dibersihkan masa handover. Perkara sama minggu lepas.',
  },
  {
    key: 'lewat',
    label: 'Lewat / kedatangan',
    text: 'Lewat 3 hari minggu ini; kedatangan perlu diperbaiki.',
  },
  {
    key: 'bagus',
    label: 'Kerja memuaskan',
    text: 'Kerja memuaskan. Susunan rak dan display kemas sepanjang minggu.',
  },
];
