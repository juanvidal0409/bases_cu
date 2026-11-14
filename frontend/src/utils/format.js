const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export const formatMoney = (v) => (v === null || v === undefined || v === '' ? '—' : money.format(Number(v)));
export const formatNumber = (v) => (v === null || v === undefined || v === '' ? '—' : number.format(Number(v)));

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
