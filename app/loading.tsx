export default function GlobalLoading() {
  return (
    <main className="flex flex-col items-center justify-center h-[80vh] animate-pulse">
      {/* LOGO SIMBÓLICO */}
      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-red-600 to-brand-blue opacity-70 mb-6" />
      
      {/* LINHAS ANIMADAS */}
      <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-56 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-44" />

      {/* PEQUENO INDICADOR DE CARREGAMENTO */}
      <div className="mt-10 flex gap-2">
        <div className="h-3 w-3 bg-brand-red rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="h-3 w-3 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="h-3 w-3 bg-brand-red rounded-full animate-bounce" />
      </div>

      {/* TEXTO OPCIONAL */}
      <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        IUMATEC lädt Inhalte …
      </p>
    </main>
  );
}
