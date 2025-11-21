import CheckoutButton from "@/components/CheckoutButton";

export default function TestPage() {
  const items = [
    {
      id: "test-product-1",
      title: "Test Produkt",
      price: 49.9,
      quantity: 1,
    },
  ];

  return (
    <div>
      {/* ...conteúdo da página... */}
      <CheckoutButton items={items} />
    </div>
  );
}
