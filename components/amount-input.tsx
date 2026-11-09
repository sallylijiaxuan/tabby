"use client";
import { useEffect, useId, useState } from 'react';
import { calculateAmount } from '../lib/arithmetic';

export function AmountInput({ value, onCommit, label, quantity = false, allowNegative = false }: {
  value: number; onCommit: (value: number) => void; label: string; quantity?: boolean; allowNegative?: boolean;
}) {
  const [draft, setDraft] = useState(value === 0 ? '' : String(value));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => { if (!editing) setDraft(value === 0 ? '' : String(value)); }, [value, editing]);
  function commit() {
    try {
      const result = calculateAmount(draft, allowNegative);
      if (quantity && (!Number.isInteger(result) || result < 1)) throw new Error('Quantity must be a whole number of at least 1.');
      onCommit(result);
      setDraft(result === 0 ? '' : String(result));
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check this calculation.');
      return false;
    }
  }
  return <span className="amount-control">
    <input type="text" inputMode="text" aria-label={label} placeholder="0"
      value={draft} aria-invalid={!!error} aria-describedby={error ? id : undefined}
      title="Enter an amount or calculation, such as 6+5. Press Enter to calculate."
      onFocus={e => { setEditing(true); if (value === 0) setDraft(''); e.currentTarget.select(); }}
      onChange={e => { setDraft(e.target.value); setError(''); }}
      onBlur={() => { if (commit()) setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); if (commit()) e.currentTarget.blur(); }
        if (e.key === 'Escape') { setDraft(value === 0 ? '' : String(value)); setError(''); setEditing(false); }
      }}/>
    {error && <span className="amount-error" id={id} role="alert">{error}</span>}
  </span>;
}
