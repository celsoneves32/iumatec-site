import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatPriceCH } from "@/lib/formatPrice";

type ProductLike = {
  title?: string;
  brand?: string;
  price?: number;
  sku?: string;
  ean?: string;
  internalNumber?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  description2?: string;
  deliveryDate?: string | null;
};

type StockLike = {
  label?: string;
};

type Props = {
  product: ProductLike;
  stock: StockLike;
  delivery: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 34,
    fontSize: 11,
    color: "#171717",
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  topBar: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  brand: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: "#0f766e",
    fontWeight: 700,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0a0a0a",
    marginBottom: 6,
  },
  meta: {
    fontSize: 10,
    color: "#737373",
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    color: "#0a0a0a",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  rowLast: {
    flexDirection: "row",
  },
  cellLabel: {
    width: "34%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
    fontSize: 10,
    fontWeight: 700,
    color: "#525252",
  },
  cellValue: {
    width: "66%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 10,
    color: "#171717",
  },
  paragraphBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  paragraph: {
    fontSize: 10,
    color: "#262626",
    lineHeight: 1.55,
    marginBottom: 8,
  },
  footer: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    fontSize: 9,
    color: "#737373",
  },
});

export default function ProductDatasheetDocument({
  product,
  stock,
  delivery,
}: Props) {
  const rows = [
    { label: "Produkt", value: product.title || "" },
    { label: "Marke", value: product.brand || "" },
    {
      label: "Preis",
      value:
        typeof product.price === "number" ? formatPriceCH(product.price) : "",
    },
    { label: "SKU", value: product.sku || "" },
    { label: "EAN", value: product.ean || "" },
    { label: "Interne Nummer", value: product.internalNumber || "" },
    { label: "Kategorie", value: product.category || "" },
    { label: "Unterkategorie", value: product.subcategory || "" },
    { label: "Verfügbarkeit", value: stock.label || "" },
    { label: "Lieferung", value: delivery || "Lieferdatum folgt" },
  ].filter((row) => row.value && String(row.value).trim() !== "");

  const metaText = [product.category, product.subcategory]
    .filter(Boolean)
    .join(" / ");

  return (
    <Document
      title={`${product.title || "Produkt"} – Produktdatenblatt`}
      author="IUMATEC"
      subject="Produktdatenblatt"
      creator="IUMATEC"
      producer="IUMATEC"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>{product.brand || "IUMATEC"}</Text>
          <Text style={styles.title}>{product.title || "Produkt"}</Text>
          {metaText ? <Text style={styles.meta}>{metaText}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technische Daten</Text>

          <View style={styles.table}>
            {rows.map((row, index) => (
              <View
                key={row.label}
                style={index === rows.length - 1 ? styles.rowLast : styles.row}
              >
                <Text style={styles.cellLabel}>{row.label}</Text>
                <Text style={styles.cellValue}>{String(row.value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {product.description || product.description2 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Produktbeschreibung</Text>

            <View style={styles.paragraphBox}>
              {product.description ? (
                <Text style={styles.paragraph}>{product.description}</Text>
              ) : null}

              {product.description2 ? (
                <Text style={styles.paragraph}>{product.description2}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>IUMATEC Schweiz — Produktdatenblatt automatisch generiert.</Text>
        </View>
      </Page>
    </Document>
  );
}