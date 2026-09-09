import { Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { MONTHS } from '@/data/checklist';
import { OutletReport, hqReport, weakestFirst } from '@/data/hq';
import { ROLE_LABEL, User } from '@/data/users';
import { useBranches } from '@/store/useBranches';
import { useMarks, weekMark } from '@/store/useMarks';
import { useReturns } from '@/store/useReturns';
import { useUsers } from '@/store/useUsers';
import { C, pctColor } from '@/theme/scoring';

/**
 * The outlet report, shared by every head-office role. Outlets, not people: it
 * summarises each kedai and never shows an individual's marking sheet. Which
 * columns appear is decided by the viewer's role — a cross-branch `manager` is
 * blind to the stor side, so those figures come back null and are rendered as
 * "not in remit" rather than as a zero.
 */
export function OutletReportView({ me }: { me: User }) {
  const users = useUsers((s) => s.users);
  const branches = useBranches((s) => s.branches);
  const records = useReturns((s) => s.records);
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);

  const { total, outlets, quiet } = hqReport({
    branches,
    users,
    records,
    markOf: (user, weekIdx) => weekMark(user, weekIdx, submitted),
    viewerRole: me.role,
  });

  const weakest = weakestFirst(outlets);
  const storBlind = total.stor == null;
  const roleLabel = ROLE_LABEL[me.role];

  return (
    <>
      <MonoLabel>
        {me.name} · {roleLabel} · Semua cawangan
      </MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">Laporan cawangan</Text>
      <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-1.5">
        {MONTHS[MONTHS.length - 1]} · {outlets.length} cawangan berdata
        {quiet > 0 ? ` · ${quiet} lagi belum ada pekerja atau pulangan` : ''}
      </Text>

      {/* ------------------------------------------------ all outlets ---- */}
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-5 mb-2">
        Semua cawangan
      </Text>

      <View className="flex-row gap-2.5">
        <Figure
          label="Markah kedai"
          value={total.kedai.avg}
          suffix="%"
          tone={pctColor(total.kedai.avg, passThreshold)}
          foot={`${total.kedai.marked} penilaian · ${total.kedai.people} pekerja`}
        />
        {total.stor ? (
          <Figure
            label="Markah stor · HQ"
            value={total.stor.avg}
            suffix="%"
            tone={pctColor(total.stor.avg, passThreshold)}
            foot={`${total.stor.marked} penilaian · ${total.stor.people} pekerja stor pusat`}
          />
        ) : (
          <OutOfRemit />
        )}
      </View>

      <View className="flex-row gap-2.5 mt-2.5">
        <Figure
          label="Belum dinilai"
          value={total.kedai.gaps + (total.stor?.gaps ?? 0)}
          tone={total.kedai.gaps > 0 ? C.warn : C.pass}
          foot={`daripada ${total.kedai.cellTotal + (total.stor?.cellTotal ?? 0)} minggu × pekerja`}
        />
        {total.returns ? (
          <Figure
            label="Hantar ke kerani"
            value={total.returns.submissionPct}
            suffix="%"
            tone={pctColor(total.returns.submissionPct, 100)}
            foot={`${total.returns.received} bil diterima`}
          />
        ) : (
          <OutOfRemit />
        )}
      </View>

      {total.returns && total.returns.aged > 0 && (
        <View
          className="mt-2.5 rounded-[13px] px-[15px] py-3.5 border"
          style={{ backgroundColor: C.failBg, borderColor: C.fail }}
        >
          <Text className="font-sans-semi text-[13px]" style={{ color: C.fail }}>
            {total.returns.aged} bil melebihi 2 bulan merentas semua cawangan
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-2 mt-1.5">
            {total.returns.overdue > 0
              ? `${total.returns.overdue} sudah lepas tempoh seminggu untuk clear. Tertua ${total.returns.oldestDays} hari.`
              : `Masih dalam tempoh seminggu untuk clear. Tertua ${total.returns.oldestDays} hari.`}
          </Text>
        </View>
      )}

      {storBlind && (
        <View
          className="mt-2.5 rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.warnBg, borderColor: C.warnLine }}
        >
          <Text className="font-sans-med text-[12.5px] leading-[19px]" style={{ color: C.warnInk }}>
            Peranan {roleLabel} tidak merangkumi bahagian stor — markah stor dan
            pulangan tidak dipaparkan.
          </Text>
        </View>
      )}

      {/* ---------------------------------------------- per outlet ------- */}
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-6 mb-2">
        Ikut cawangan
      </Text>

      <View className="gap-2">
        {outlets.map((o) => (
          <OutletCard key={o.branchId} report={o} passThreshold={passThreshold} />
        ))}
      </View>

      {weakest.length > 1 && (
        <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-3">
          {weakest[0].label} paling rendah pada {weakest[0].kedai.avg}% markah kedai,{' '}
          {weakest[weakest.length - 1].kedai.avg - weakest[0].kedai.avg} mata di bawah{' '}
          {weakest[weakest.length - 1].label}.
        </Text>
      )}
    </>
  );
}

function OutletCard({
  report,
  passThreshold,
}: {
  report: OutletReport;
  passThreshold: number;
}) {
  const { kedai, stor, returns } = report;
  const unmarked = kedai.marked === 0 && (stor?.marked ?? 0) === 0;

  return (
    <Card className="px-[15px] py-3.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-sans-semi text-[15px] text-ink">{report.label}</Text>
        <Text className="font-mono-med text-[10px] uppercase tracking-label text-ink-5">
          {kedai.people + (stor?.people ?? 0)} pekerja
        </Text>
      </View>

      {unmarked ? (
        <Text className="font-sans text-[12.5px] text-ink-4 mt-2">
          Tiada penilaian direkod bulan ini.
        </Text>
      ) : (
        <View className="flex-row gap-4 mt-3">
          <Metric
            label="Kedai"
            value={kedai.marked ? `${kedai.avg}%` : '—'}
            tone={kedai.marked ? pctColor(kedai.avg, passThreshold) : C.ink6}
          />
          {stor && (
            <Metric
              label="Stor"
              value={stor.marked ? `${stor.avg}%` : '—'}
              tone={stor.marked ? pctColor(stor.avg, passThreshold) : C.ink6}
            />
          )}
          <Metric
            label="Belum dinilai"
            value={String(kedai.gaps + (stor?.gaps ?? 0))}
            tone={kedai.gaps + (stor?.gaps ?? 0) > 0 ? C.warn : C.pass}
          />
          {returns && (
            <Metric
              label="Hantar"
              value={returns.received ? `${returns.submissionPct}%` : '—'}
              tone={returns.received ? pctColor(returns.submissionPct, 100) : C.ink6}
            />
          )}
        </View>
      )}

      {returns && returns.aged > 0 && (
        <Text className="font-sans text-[12px] leading-[18px] mt-2.5" style={{ color: C.fail }}>
          {returns.aged} bil melebihi 2 bulan
          {returns.overdue > 0 ? `, ${returns.overdue} lepas tempoh clear` : ''} · tertua{' '}
          {returns.oldestDays} hari
        </Text>
      )}
      {returns && returns.aged === 0 && returns.open > 0 && (
        <Text className="font-sans text-[12px] leading-[18px] text-ink-4 mt-2.5">
          {returns.open} bil terbuka, semua dalam tempoh 2 bulan.
        </Text>
      )}
    </Card>
  );
}

function Figure({
  label,
  value,
  suffix,
  tone,
  foot,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: string;
  foot: string;
}) {
  return (
    <Card className="flex-1 p-[15px]">
      <MonoLabel>{label}</MonoLabel>
      <View className="flex-row items-baseline gap-1 mt-2.5">
        <Text className="font-mono-semi text-[30px]" style={{ color: tone }}>
          {value}
        </Text>
        {suffix && <Text className="font-mono text-[14px] text-ink-6">{suffix}</Text>}
      </View>
      <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">{foot}</Text>
    </Card>
  );
}

/** Placeholder that keeps the grid square when the stor side is out of remit. */
function OutOfRemit() {
  return (
    <Card className="flex-1 p-[15px]">
      <MonoLabel>Bahagian stor</MonoLabel>
      <Text className="font-mono-semi text-[30px] mt-2.5" style={{ color: C.ink7 }}>
        —
      </Text>
      <Text className="font-sans text-[11.5px] leading-4 text-ink-5 mt-[7px]">
        Tiada dalam bidang peranan ini
      </Text>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View>
      <Text className="font-mono-semi text-[17px]" style={{ color: tone }}>
        {value}
      </Text>
      <Text className="font-mono-med text-[9px] uppercase tracking-label text-ink-5 mt-1">
        {label}
      </Text>
    </View>
  );
}
