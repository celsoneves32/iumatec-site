import CheckoutButton from "@/components/CheckoutButton";

export default function CheckoutTestPage() {
  // Aqui só um exemplo fixo para testar
  const items = [
    {
      id: "test-product-1",
      title: "Test Produkt",
      price: 49.9, // CHF
      quantity: 1,
    },
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Checkout Test</h1>
      <p className="mb-6 text-gray-700">
        Dies ist eine Testseite, um den Stripe Checkout zu prüfen.
      </p>

      <div className="border rounded-lg p-4 mb-4">
        <div className="flex justify-between mb-2">
          <span>{items[0].title}</span>
          <span>{items[0].price.toFixed(2)} CHF</span>
        </div>
      </div>

      <CheckoutButton items={items} />
    </main>
  );
}
