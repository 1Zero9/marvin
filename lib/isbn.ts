export function normaliseIsbn(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const isbn = value.replace(/[^0-9Xx]/g, "").toUpperCase();
  return isbn.length === 10 || isbn.length === 13 ? isbn : null;
}

function isbn13CheckDigit(prefix: string) {
  const sum = [...prefix].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function equivalentIsbns(value: unknown): string[] {
  const isbn = normaliseIsbn(value);
  if (!isbn) return [];
  if (isbn.length === 13 && isbn.startsWith("978")) {
    const core = isbn.slice(3, 12);
    const sum = [...core].reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
    const check = 11 - (sum % 11);
    return [isbn, `${core}${check === 10 ? "X" : check === 11 ? "0" : check}`];
  }
  if (isbn.length === 10) {
    const prefix = `978${isbn.slice(0, 9)}`;
    return [isbn, `${prefix}${isbn13CheckDigit(prefix)}`];
  }
  return [isbn];
}
