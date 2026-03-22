import type { Granularity } from './granularity';

type Props = {
  enabled: Granularity[];
  value: Granularity;
  onChange: (g: Granularity) => void;
  daysSpan: number;
};

const LABELS: Record<Granularity, string> = {
  daily: 'Daily',
  month: 'Month',
  year: 'Year',
};

export default function DashboardGranularityBar({ enabled, value, onChange, daysSpan }: Props) {
  const all: Granularity[] = ['daily', 'month', 'year'];

  return (
    <div className="granularity-bar glass-panel">
      <div className="granularity-bar-head">
        <span className="granularity-bar-title">Cash flow period</span>
        <span className="granularity-bar-meta">
          Data span: {daysSpan < 1 ? '< 1 day' : `${Math.round(daysSpan)} days`}
        </span>
      </div>
      <p className="granularity-bar-hint text-muted">
        Shorter ranges only allow daily view. Month unlocks after ~30 days of span; year unlocks after ~2 years.
      </p>
      <div className="granularity-bar-segments" role="tablist" aria-label="Timeline granularity">
        {all.map((g) => {
          const isOn = enabled.includes(g);
          const active = value === g;
          return (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={!isOn}
              className={`granularity-seg ${active ? 'is-active' : ''} ${!isOn ? 'is-frozen' : ''}`}
              onClick={() => isOn && onChange(g)}
              title={
                !isOn
                  ? g === 'month'
                    ? 'Enable when your data spans at least ~30 days'
                    : g === 'year'
                      ? 'Enable when your data spans at least ~2 years'
                      : 'Always available'
                  : LABELS[g]
              }
            >
              {LABELS[g]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
