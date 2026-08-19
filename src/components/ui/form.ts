/** Shared form control classes so every form in the app looks consistent. */

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50";

export const labelClass = "block text-sm font-semibold text-slate-800";

export const hintClass = "mt-1 text-xs text-slate-500";

export const errorClass = "mt-1 text-xs font-medium text-rose-600";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60";
