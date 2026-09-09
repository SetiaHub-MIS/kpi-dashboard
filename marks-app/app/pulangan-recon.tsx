import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  FIELD_LABEL,
  Mapping,
  VENDOR_FIELDS,
  VendorField,
  VendorRow,
  canReconcile,
  guessMapping,
  locationCounts,
  parseCsv,
  reconcile,
  sniffDelimiter,
  toVendorRows,
} from '@/data/reconcile';
import { REASON_LABEL, ageingStatus, fmtDate, isCleared, ownerForRole } from '@/data/returns';
import { returnsVisibleTo, useReturns } from '@/store/useReturns';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/**
 * Rule 4's comparison, done by the app instead of by eye. The vendor CSV is
 * pasted in, its columns are mapped, and the two lists are diffed on bill
 * number. Nothing is written from here — a bill the stock system knows and we
 * do not is handed to the normal recording form to be confirmed by a person.
 */
export default function PulanganRecon() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const records = useReturns((s) => s.records);

  // Recording a bill stays a store job, as it is on the returns list itself;
  // everyone else can compare the two systems but not write from here.
  const canRecord = ownerForRole(me?.role) === 'store';

  const [raw, setRaw] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  /** null until the file is parsed; then the guess, which the user can correct. */
  const [mapping, setMapping] = useState<Mapping | null>(null);
  /** Location codes excluded from the diff; empty means every code counts. */
  const [dropped, setDropped] = useState<string[]>([]);

  const table = useMemo(
    () => (raw.trim() ? parseCsv(raw, sniffDelimiter(raw)) : []),
    [raw]
  );
  const header = table[0] ?? [];
  const columns = useMemo(
    () => header.map((h, i) => (h.trim() === '' ? `Lajur ${i + 1}` : h)),
    [header]
  );

  // The guess stands until the user overrides it, and is redone per paste.
  const active: Mapping | null = useMemo(() => {
    if (table.length === 0) return null;
    return mapping ?? guessMapping(header);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, mapping]);

  const allRows = useMemo(
    () => (active && canReconcile(active) ? toVendorRows(table, active, hasHeader) : []),
    [active, table, hasHeader]
  );
  const locations = useMemo(() => locationCounts(allRows), [allRows]);
  const rows = useMemo(
    () => allRows.filter((r) => !r.branch || !dropped.includes(r.branch)),
    [allRows, dropped]
  );

  const mine = returnsVisibleTo(records, me);
  const result = useMemo(
    () => (active && canReconcile(active) ? reconcile(mine, rows) : null),
    [active, rows, mine]
  );

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) return;
    setRaw(text);
    setMapping(null);
    setDropped([]);
  };

  const setField = (field: VendorField, index: number | null) =>
    setMapping({ ...(active ?? guessMapping(header)), [field]: index });

  const recordVendorRow = (row: VendorRow) =>
    router.push({
      pathname: '/pulangan-new',
      params: {
        billNo: row.billNo,
        billDate: row.billDate ?? '',
        supplier: row.supplier,
        // Left blank for a type we do not model, so the form asks rather than guesses.
        reason: row.reason ?? '',
        // The export's location code is our branch id, so the outlet carries over.
        outlet: row.branch,
      },
    });

  return (
    <Screen>
      <BackLink label="Pulangan" />
      <Text className="font-sans-semi text-[22px] text-ink mt-4">Banding sistem stok</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        Tampal export CSV dari sistem stok. Aplikasi akan padankan ikut no. bil
        dan tunjuk bil yang ada di satu sistem sahaja.
      </Text>

      <View className="flex-row gap-2 mt-4">
        <Pressable
          onPress={paste}
          accessibilityRole="button"
          className="flex-1 py-3 rounded-xl bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-[13px] text-white">Tampal dari clipboard</Text>
        </Pressable>
        {raw !== '' && (
          <Pressable
            onPress={() => {
              setRaw('');
              setMapping(null);
              setDropped([]);
            }}
            accessibilityRole="button"
            className="px-4 py-3 rounded-xl border border-line bg-card items-center active:opacity-70"
          >
            <Text className="font-sans-med text-[13px] text-ink-3">Kosongkan</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        value={raw}
        onChangeText={(t) => {
          setRaw(t);
          setMapping(null);
          setDropped([]);
        }}
        placeholder="atau tampal terus di sini…"
        placeholderTextColor={C.ink6}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2 font-mono text-[11px] text-ink-2"
        style={{ minHeight: 72, maxHeight: 160, textAlignVertical: 'top' }}
      />

      {table.length > 0 && active && (
        <>
          <Card className="p-[15px] mt-2.5">
            <View className="flex-row items-center justify-between">
              <MonoLabel>Padanan lajur</MonoLabel>
              <Pressable
                onPress={() => setHasHeader(!hasHeader)}
                accessibilityRole="switch"
                accessibilityState={{ checked: hasHeader }}
                className="px-2.5 py-1 rounded-md border"
                style={{ borderColor: C.line, backgroundColor: hasHeader ? C.rule : C.card }}
              >
                <Text className="font-mono-med text-[10px] uppercase tracking-label text-ink-4">
                  {hasHeader ? 'Baris 1 = tajuk' : 'Tiada tajuk'}
                </Text>
              </Pressable>
            </View>
            <Text className="font-sans text-xs leading-[18px] text-ink-4 mt-2">
              Susunan lajur sistem stok belum disahkan, jadi tekan untuk betulkan
              jika teka salah. No. bil wajib.
            </Text>

            {VENDOR_FIELDS.map((field) => (
              <View key={field} className="mt-3">
                <Text className="font-sans-med text-[12.5px] text-ink-2">
                  {FIELD_LABEL[field]}
                  {field === 'billNo' && <Text style={{ color: C.fail }}> *</Text>}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1.5">
                  <View className="flex-row gap-1.5 pr-3">
                    <Chip
                      label="—"
                      on={active[field] == null}
                      onPress={() => setField(field, null)}
                    />
                    {columns.map((c, i) => (
                      <Chip
                        key={i}
                        label={c}
                        on={active[field] === i}
                        onPress={() => setField(field, i)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}
          </Card>

          {!canReconcile(active) && (
            <Note tone="warn">
              Pilih lajur no. bil dahulu — padanan dibuat ikut nombor bil sahaja.
            </Note>
          )}

          {locations.length > 0 && (
            <Card className="p-[15px] mt-2.5">
              <MonoLabel>Kod lokasi dalam fail</MonoLabel>
              <Text className="font-sans text-xs leading-[18px] text-ink-4 mt-2">
                Kod sistem stok sama dengan kod cawangan app. Matikan kod yang
                bukan untuk semakan ini.
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                {locations.map((loc) => {
                  const on = !dropped.includes(loc.code);
                  return (
                    <Chip
                      key={loc.code}
                      label={`${loc.code} · ${loc.count}`}
                      on={on}
                      onPress={() =>
                        setDropped(
                          on
                            ? [...dropped, loc.code]
                            : dropped.filter((c) => c !== loc.code)
                        )
                      }
                    />
                  );
                })}
              </View>
            </Card>
          )}
        </>
      )}

      {result && (
        <>
          <View className="flex-row gap-2.5 mt-2.5">
            <Stat
              value={result.matched.length}
              label="padan"
              tone={result.matched.length ? C.pass : C.ink}
            />
            <Stat
              value={result.appOnly.length}
              label="app sahaja"
              tone={result.appOnly.length ? C.warn : C.pass}
            />
            <Stat
              value={result.vendorOnly.length}
              label="stok sahaja"
              tone={result.vendorOnly.length ? C.fail : C.pass}
            />
          </View>

          {(result.duplicates.length > 0 || result.unparsedDates.length > 0) && (
            <Note tone="warn">
              {result.duplicates.length > 0 &&
                `${result.duplicates.length} no. bil berulang dalam fail. `}
              {result.unparsedDates.length > 0 &&
                `${result.unparsedDates.length} tarikh tak dapat dibaca — tarikh tidak dibanding untuk baris itu.`}
            </Note>
          )}

          {result.unknownTypes.length > 0 && (
            <Note tone="warn">
              {result.unknownTypes.length} bil berjenis bukan rosak atau luput
              (cth. GOOD STOCK RETURN). App ini hanya model dua sebab itu, jadi
              sebabnya kena dipilih sendiri semasa merekod.
            </Note>
          )}

          <Section
            title="Hanya dalam sistem stok"
            count={result.vendorOnly.length}
            empty="Setiap bil dalam fail ada dalam app."
            note="Bil ini belum direkod di sini, jadi ia tiada dalam KPI langsung."
          >
            {result.vendorOnly.map((row) => (
              <Card key={`${row.key}-${row.line}`} className="px-3.5 py-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-mono-semi text-[13px] text-ink">{row.billNo}</Text>
                    <Text className="font-sans text-[12px] text-ink-4 mt-1">
                      {row.billDate ? fmtDate(row.billDate) : row.billDateRaw || 'tarikh —'}
                      {row.supplier ? ` · ${row.supplier}` : ''}
                      {row.amount ? ` · ${row.amount}` : ''}
                    </Text>
                    {row.billType !== '' && (
                      <Text
                        className="font-mono text-[10px] mt-1"
                        style={{ color: row.reason ? C.ink5 : C.warn }}
                      >
                        {row.billType}
                        {row.reason ? '' : ' · sebab tak dimodel'}
                      </Text>
                    )}
                    <Text className="font-mono text-[10px] text-ink-6 mt-1">
                      {row.branch ? `${row.branch} · ` : ''}baris {row.line}
                    </Text>
                  </View>
                  {canRecord && (
                    <Pressable
                      onPress={() => recordVendorRow(row)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rekod bil ${row.billNo}`}
                      className="px-3 py-2 rounded-lg bg-ink active:opacity-80"
                    >
                      <Text className="font-sans-semi text-[12px] text-white">Rekod</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            ))}
          </Section>

          <Section
            title="Hanya dalam app"
            count={result.appOnly.length}
            empty="Setiap bil app ada dalam fail sistem stok."
            note="Bil ini direkod di sini tetapi tiada dalam export — semak sama ada pelarasan stok sudah dibuat."
          >
            {result.appOnly.map((r) => {
              const open = !isCleared(r);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/bil/${r.id}`)}
                  accessibilityRole="button"
                  className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-mono-semi text-[13px] text-ink">{r.billNo}</Text>
                      <Text className="font-sans text-[12px] text-ink-4 mt-1">
                        {fmtDate(r.billDate)} · {r.supplier}
                      </Text>
                    </View>
                    <Text
                      className="font-mono-med text-[10px] uppercase tracking-label"
                      style={{ color: open ? C.warn : C.ink6 }}
                    >
                      {open ? ageingStatus(r) === 'ok' ? 'terbuka' : 'lewat' : 'selesai'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Section>

          <Section
            title="Padan tapi butiran beza"
            count={result.mismatched.length}
            empty="Tarikh dan pembekal sepadan untuk semua bil yang dipadankan."
            note="No. bil sama, tetapi satu sistem menyimpan butiran lain."
          >
            {result.mismatched.map((m) => (
              <Card key={m.record.id} className="px-3.5 py-3">
                <Text className="font-mono-semi text-[13px] text-ink">{m.record.billNo}</Text>
                {m.clashes.includes('billDate') && (
                  <Clash
                    label="Tarikh bil"
                    app={fmtDate(m.record.billDate)}
                    vendor={m.row.billDate ? fmtDate(m.row.billDate) : m.row.billDateRaw}
                  />
                )}
                {m.clashes.includes('supplier') && (
                  <Clash label="Pembekal" app={m.record.supplier} vendor={m.row.supplier} />
                )}
                {m.clashes.includes('reason') && (
                  <Clash
                    label="Sebab"
                    app={REASON_LABEL[m.record.reason]}
                    vendor={m.row.billType || (m.row.reason ? REASON_LABEL[m.row.reason] : '')}
                  />
                )}
              </Card>
            ))}
          </Section>
        </>
      )}
    </Screen>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      className="px-2.5 py-1.5 rounded-lg border"
      style={{ borderColor: on ? 'transparent' : C.line, backgroundColor: on ? C.ink : C.card }}
    >
      <Text className="font-mono text-[11px]" style={{ color: on ? '#fff' : C.ink3 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <Card className="flex-1 p-[13px]">
      <Text className="font-mono-semi text-[24px]" style={{ color: tone }}>
        {value}
      </Text>
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-1">
        {label}
      </Text>
    </Card>
  );
}

function Note({ tone, children }: { tone: 'warn' | 'fail'; children: React.ReactNode }) {
  return (
    <View
      className="mt-2.5 rounded-[10px] px-3.5 py-3 border"
      style={{
        backgroundColor: tone === 'warn' ? C.warnBg : C.failBg,
        borderColor: tone === 'warn' ? C.warnLine : C.fail,
      }}
    >
      <Text
        className="font-sans-med text-[12.5px] leading-[19px]"
        style={{ color: tone === 'warn' ? C.warnInk : C.fail }}
      >
        {children}
      </Text>
    </View>
  );
}

function Section({
  title,
  count,
  empty,
  note,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Text className="font-sans-semi text-[13.5px] text-ink mt-5">
        {title} · {count}
      </Text>
      <Text className="font-sans text-[12px] leading-[18px] text-ink-4 mt-1 mb-2.5">
        {count === 0 ? empty : note}
      </Text>
      {count > 0 && <View className="gap-2">{children}</View>}
    </>
  );
}

function Clash({ label, app, vendor }: { label: string; app: string; vendor: string }) {
  return (
    <View className="flex-row gap-3 mt-2">
      <View className="flex-1">
        <MonoLabel>{`${label} · app`}</MonoLabel>
        <Text className="font-sans text-[12.5px] text-ink-2 mt-1">{app || '—'}</Text>
      </View>
      <View className="flex-1">
        <MonoLabel>{`${label} · stok`}</MonoLabel>
        <Text className="font-sans text-[12.5px] mt-1" style={{ color: C.fail }}>
          {vendor || '—'}
        </Text>
      </View>
    </View>
  );
}
