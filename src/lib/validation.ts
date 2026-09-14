/* ============================================================
   Validación de los datos del checkout.
   Cada función devuelve el mensaje de error, o null si el dato sirve.
   ============================================================ */

/** Solo dígitos. "0981 123-456" → "0981123456", "+595 981…" → "595981…". */
export function phoneDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Celular paraguayo en formato local (09XXXXXXXX). Acepta que lo escriban
 * con espacios, guiones, +595 o 595. Devuelve null si no es un celular.
 */
export function normalizePhone(value: string): string | null {
  let d = phoneDigits(value);
  if (d.startsWith('595')) d = `0${d.slice(3)}`;
  if (/^9\d{8}$/.test(d)) d = `0${d}`;
  return /^09[6-9]\d{7}$/.test(d) ? d : null;
}

const LETTERS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

export function validateName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, ' ');
  if (v.length < 3) return 'Escribí tu nombre y apellido.';
  if (!LETTERS.test(v)) return 'El nombre solo puede tener letras.';
  const words = v.split(' ').filter((w) => w.length >= 2);
  if (words.length < 2) return 'Escribí nombre y apellido.';
  if (v.length > 80) return 'El nombre es demasiado largo.';
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return 'Necesitamos tu celular para coordinar el pedido.';
  return normalizePhone(value) ? null : 'Escribí un celular paraguayo válido, ej.: 0981 123 456.';
}

export function validateCity(value: string): string | null {
  const v = value.trim();
  if (v.length < 3) return 'Escribí tu ciudad y barrio.';
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(v)) return 'Escribí el nombre de tu ciudad y barrio.';
  if (v.length > 80) return 'Es demasiado largo.';
  return null;
}

export function validateAddress(value: string): string | null {
  const v = value.trim().replace(/\s+/g, ' ');
  if (v.length < 8) return 'Escribí la dirección completa (calle, número o referencia).';
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(v)) return 'La dirección tiene que tener el nombre de la calle.';
  if (v.split(' ').length < 2) return 'Escribí calle y número o una referencia.';
  if (v.length > 300) return 'La dirección es demasiado larga.';
  return null;
}

export function validateEmail(value: string, required = false): string | null {
  const v = value.trim();
  if (!v) return required ? 'Necesitamos tu correo para el pago con tarjeta.' : null;
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) || v.length > 120) return 'Revisá el correo: ej. nombre@gmail.com.';
  return null;
}

/** C.I. paraguaya: 5 a 8 dígitos (se aceptan puntos y dígito verificador de RUC). */
export function validateDocument(value: string, required = false): string | null {
  const raw = value.trim();
  if (!raw) return required ? 'Necesitamos tu número de C.I. para el pago con tarjeta.' : null;
  if (!/^[\d.\s-]+$/.test(raw)) return 'La C.I. solo puede tener números.';
  const digits = raw.split('-')[0].replace(/\D/g, '');
  if (digits.length < 5 || digits.length > 8) return 'Revisá la C.I.: tiene entre 5 y 8 números.';
  return null;
}

/* ---------- RUC (factura) ---------- */

/** Dígito verificador del RUC paraguayo (módulo 11, pesos 2..11 desde la derecha). */
export function rucCheckDigit(base: string): number {
  let k = 2;
  let total = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    if (k > 11) k = 2;
    total += Number(base[i]) * k;
    k++;
  }
  const rest = total % 11;
  return rest > 1 ? 11 - rest : 0;
}

/** "4.673.382-1" → "4673382-1". Devuelve null si el formato no es de RUC. */
export function normalizeRuc(value: string): string | null {
  const v = String(value || '').replace(/[.\s]/g, '');
  const m = v.match(/^(\d{5,8})-?(\d)$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function validateRuc(value: string): string | null {
  if (!value.trim()) return 'Escribí el RUC para la factura.';
  const ruc = normalizeRuc(value);
  if (!ruc) return 'Escribí el RUC con su dígito verificador, ej.: 80009735-1.';
  const [base, dv] = ruc.split('-');
  if (rucCheckDigit(base) !== Number(dv)) return 'El dígito verificador del RUC no es correcto. Revisalo.';
  return null;
}

export function validateRazonSocial(value: string): string | null {
  const v = value.trim();
  if (v.length < 3) return 'Escribí el nombre o razón social que va en la factura.';
  if (v.length > 120) return 'La razón social es demasiado larga.';
  return null;
}
