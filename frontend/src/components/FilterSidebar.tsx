import type { Dispatch, SetStateAction } from 'react';
import { LogOut, Activity, X } from 'lucide-react';
import type { Transaction } from '../types/transaction';

export interface FilterState {
  startDate: string;
  endDate: string;
  minAmount: number;
  maxAmount: number;
  categories: string[];
}

type FilterSidebarProps = {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  allCategories: string[];
  onLogout: () => void;
  onCloseMobile?: () => void;
};

export default function FilterSidebar({
  filters,
  setFilters,
  allCategories,
  onLogout,
  onCloseMobile,
}: FilterSidebarProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ background: 'var(--accent-primary)', padding: 8, borderRadius: 8 }}>
          <Activity color="white" size={24} />
        </div>
        <h2 className="gradient-text" style={{ fontSize: 18, flex: 1 }}>
          UPI Expense Tracker
        </h2>
        {onCloseMobile && (
          <button className="sidebar-close-btn" onClick={onCloseMobile} aria-label="Close sidebar">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="filter-group">
        <label className="filter-label">Filter by Date</label>
        <input
          type="date"
          className="input"
          style={{ marginBottom: 12 }}
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <input
          type="date"
          className="input"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Transaction Amount Limit</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="number"
            className="input"
            placeholder="Min"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: Number(e.target.value) })}
          />
          <input
            type="number"
            className="input"
            placeholder="Max"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          Categories
          {filters.categories.length > 0 && (
            <span
              style={{ fontSize: 12, color: 'var(--accent-primary)', cursor: 'pointer' }}
              onClick={() => setFilters({ ...filters, categories: [] })}
            >
              Clear
            </span>
          )}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
          {allCategories.map((cat) => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFilters((f) => ({ ...f, categories: [...f.categories, cat] }));
                  } else {
                    setFilters((f) => ({ ...f, categories: f.categories.filter((c) => c !== cat) }));
                  }
                }}
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <button className="btn btn-outline" onClick={onLogout}>
        <LogOut size={16} /> Logout
      </button>
    </>
  );
}

export function categoriesFromData(data: Transaction[]): string[] {
  const cats = new Set<string>();
  data.forEach((d) => {
    if (d.Tags) cats.add(d.Tags);
  });
  return Array.from(cats);
}
