<section className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-col gap-2 text-sm text-neutral-700">
    <p>
      <span className="font-semibold">Total:&nbsp;</span>
      CHF {total.toFixed(2)}
    </p>
    <p className="text-xs text-neutral-500">
      Preise inklusive gesetzlicher MwSt. – exklusive Versandkosten.
    </p>
  </div>

  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
    {/* Warenkorb leeren → mesmo tamanho que Zur Kasse, estilo secundário */}
    <button
      type="button"
      onClick={clearCart}
      className="px-6 py-2 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition"
    >
      Warenkorb leeren
    </button>

    {/* Zur Kasse → botão principal vermelho */}
    <button
      type="button"
      onClick={handleCheckout}
      disabled={!hasItems || loadingCheckout}
      className="px-6 py-2 rounded-xl bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed transition"
    >
      {loadingCheckout ? "Weiter zur Kasse..." : "Zur Kasse"}
    </button>
  </div>
</section>

