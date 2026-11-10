"use client";
import { useEffect, useId, useState } from 'react';
import { calculateAmount } from '../lib/arithmetic';

const displayAmount=(value:number,currency:boolean)=>value===0?'':currency?value.toFixed(2):String(value);

export function AmountInput({ value, onCommit, label, quantity = false, allowNegative = false, currency = false }: {
  value: number; onCommit: (value: number) => void; label: string; quantity?: boolean; allowNegative?: boolean; currency?: boolean;
}) {
  const [draft, setDraft] = useState(displayAmount(value,currency));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => { if (!editing) setDraft(displayAmount(value,currency)); }, [value, editing, currency]);
  function commit() {
    try {
      const result = calculateAmount(draft, allowNegative);
      if (quantity && (!Number.isInteger(result) || result < 1)) throw new Error('Quantity must be a whole number of at least 1.');
      onCommit(result);
      setDraft(displayAmount(result,currency));
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check this calculation.');
      return false;
    }
  }
  return <span className="amount-control">
    <input type="text" inputMode="text" aria-label={label} placeholder={currency?'0.00':'0'}
      value={draft} aria-invalid={!!error} aria-describedby={error ? id : undefined}
      title="Enter an amount or calculation, such as 6+5. Press Enter to calculate."
      onFocus={e => { setEditing(true); if (value === 0) setDraft(''); e.currentTarget.select(); }}
      onChange={e => { setDraft(e.target.value); setError(''); }}
      onBlur={() => { if (commit()) setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); if (commit()) e.currentTarget.blur(); }
        if (e.key === 'Escape') { setDraft(displayAmount(value,currency)); setError(''); setEditing(false); }
      }}/>
    {error && <span className="amount-error" id={id} role="alert">{error}</span>}
  </span>;
}
