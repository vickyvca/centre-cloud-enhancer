// Generate item code automatically based on category prefix and sequence
// Format: [Category Prefix 3 chars]-[Sequence 4 digits]
// Example: MNM-0001 (Minuman), MKN-0001 (Makanan)

const categoryPrefixes: Record<string, string> = {
  "minuman": "MNM",
  "makanan ringan": "MKR",
  "rokok": "ROK",
  "mie instan": "MIE",
  "susu & dairy": "SUS",
  "roti & kue": "RTI",
  "toiletries": "TLT",
  "obat-obatan": "OBT",
  "es krim": "ESK",
  "bumbu dapur": "BMB",
};

export function getCategoryPrefix(categoryName: string): string {
  const normalized = categoryName.toLowerCase().trim();
  
  // Check exact match first
  if (categoryPrefixes[normalized]) {
    return categoryPrefixes[normalized];
  }
  
  // Fallback: take first 3 consonants or characters
  const cleaned = normalized.replace(/[^a-z]/g, "");
  const consonants = cleaned.replace(/[aeiou]/g, "");
  
  if (consonants.length >= 3) {
    return consonants.slice(0, 3).toUpperCase();
  }
  
  return cleaned.slice(0, 3).toUpperCase() || "ITM";
}

export function generateItemCode(categoryPrefix: string, sequence: number): string {
  const paddedSeq = sequence.toString().padStart(4, "0");
  return `${categoryPrefix}-${paddedSeq}`;
}

export async function getNextItemCode(
  supabaseClient: any,
  categoryId: string,
  categoryName: string
): Promise<string> {
  const prefix = getCategoryPrefix(categoryName);
  
  // Get count of items in this category
  const { count, error } = await supabaseClient
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);
  
  if (error) {
    console.error("Error getting item count:", error);
    return generateItemCode(prefix, 1);
  }
  
  return generateItemCode(prefix, (count || 0) + 1);
}
