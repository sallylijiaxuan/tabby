/** Evaluate arithmetic without executing JavaScript. Amounts are nonnegative cents. */
export function calculateAmount(input: string): number {
  const text = input.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!text) return 0;
  if (text.length > 200) throw new Error('Expression is too long.');
  let pos = 0;
  function primary(): number {
    if (text[pos] === '+' || text[pos] === '-') {
      const sign = text[pos++] === '-' ? -1 : 1;
      return sign * primary();
    }
    if (text[pos] === '(') {
      pos++;
      const result = sum();
      if (text[pos++] !== ')') throw new Error('Close the parentheses.');
      return result;
    }
    const match = text.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) throw new Error('Enter a number or calculation, like 6+5.');
    pos += match[0].length;
    return Number(match[0]);
  }
  function product(): number {
    let result = primary();
    while (text[pos] === '*' || text[pos] === '/') {
      const op = text[pos++], right = primary();
      if (op === '/' && right === 0) throw new Error('Cannot divide by zero.');
      result = op === '*' ? result * right : result / right;
    }
    return result;
  }
  function sum(): number {
    let result = product();
    while (text[pos] === '+' || text[pos] === '-') {
      const op = text[pos++], right = product();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }
  const result = sum();
  if (pos !== text.length) throw new Error('Use numbers, +, −, *, /, and parentheses.');
  if (!Number.isFinite(result) || result < 0 || !Number.isSafeInteger(Math.round(result * 100)))
    throw new Error('Enter a valid, nonnegative amount.');
  return Math.round((result + Number.EPSILON) * 100) / 100;
}
