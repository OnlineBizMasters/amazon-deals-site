export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">DealScout</p>
        <p className="mt-1 max-w-2xl">
          Hand-picked Amazon deals for US shoppers. Prices and availability are
          accurate as of the date/time indicated and are subject to change.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          As an Amazon Associate, DealScout earns from qualifying purchases.
          Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its
          affiliates. This is a demo storefront and is not affiliated with
          Amazon.
        </p>
      </div>
    </footer>
  );
}
