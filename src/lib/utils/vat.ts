import { round2 } from './money';

export const DEFAULT_VAT_RATE = Number(process.env.VAT_RATE ?? 0.2);

export const incVat = (exVat: number, rate = DEFAULT_VAT_RATE) => round2(exVat * (1 + rate));
export const exVat = (incVatAmount: number, rate = DEFAULT_VAT_RATE) => round2(incVatAmount / (1 + rate));
export const vatPortion = (incVatAmount: number, rate = DEFAULT_VAT_RATE) =>
  round2(incVatAmount - incVatAmount / (1 + rate));
