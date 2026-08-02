/**
 * Placeholder product catalog. Swap this array for a Firestore "products"
 * collection query once inventory data is wired up — the render/format
 * helpers below only need this same shape per product.
 */
const SAMPLE_PRODUCTS = [
  { id: 1, name: "Paracetamol 500mg", genericName: "Paracetamol", description: "Pain reliever & fever reducer", about: "For the temporary relief of minor aches, pains, and fever associated with colds, flu, and headaches.", details: ["Paracetamol 500mg", "Tablet, film-coated", "Pain Reliever", "Fever Reducer", "20 tablets"], price: 25, category: "otc", inStock: true },
  { id: 2, name: "Ibuprofen 200mg", genericName: "Ibuprofen", description: "Anti-inflammatory pain relief", about: "Non-steroidal anti-inflammatory drug (NSAID) for relief of mild to moderate pain, swelling, and fever.", details: ["Ibuprofen 200mg", "Tablet, film-coated", "Pain Reliever", "Anti-inflammatory", "20 tablets"], price: 35, category: "otc", inStock: true },
  { id: 3, name: "Loperamide 2mg", genericName: "Loperamide HCl", description: "Anti-diarrheal treatment", about: "For the control and symptomatic relief of acute non-specific diarrhea.", details: ["Loperamide HCl 2mg", "Capsule", "Anti-diarrheal", "6 capsules"], price: 42, category: "otc", inStock: true },
  { id: 4, name: "Cetirizine 10mg", genericName: "Cetirizine HCl", description: "24-hour allergy relief", about: "Antihistamine for relief of allergy symptoms such as sneezing, runny nose, itching, and watery eyes.", details: ["Cetirizine HCl 10mg", "Tablet, film-coated", "Antihistamine", "10 tablets"], price: 55, category: "otc", inStock: true },
  { id: 5, name: "Vitamin C 1000mg", genericName: "Ascorbic Acid", description: "Immune system support", about: "High-dose Vitamin C supplement to support the immune system and act as an antioxidant.", details: ["Ascorbic Acid 1000mg", "Tablet, film-coated", "Immune Support", "Antioxidant", "30 tablets"], price: 180, category: "vitamins", inStock: true },
  { id: 6, name: "Vitamin D3 1000IU", genericName: "Cholecalciferol", description: "Bone & immune health", about: "Supports calcium absorption for strong bones and contributes to normal immune function.", details: ["Cholecalciferol 1000IU", "Softgel capsule", "Bone Health", "Immune Support", "60 softgels"], price: 220, category: "vitamins", inStock: true },
  { id: 7, name: "Multivitamins", genericName: "Multivitamins + Minerals", description: "Daily essential nutrients", about: "A complete daily blend of essential vitamins and minerals for overall wellness.", details: ["Multivitamins + Minerals", "Tablet, sugar-coated", "Daily Nutrition", "30 tablets"], price: 350, category: "vitamins", inStock: true },
  { id: 8, name: "Fish Oil Omega-3", genericName: "Omega-3 Fatty Acids", description: "Heart & brain health support", about: "Concentrated fish oil supplement providing EPA and DHA for cardiovascular and cognitive support.", details: ["Omega-3 Fish Oil 1000mg", "Softgel capsule", "Heart Health", "Brain Health", "60 softgels"], price: 420, category: "vitamins", inStock: true },
  { id: 9, name: "Zinc 50mg", genericName: "Zinc Sulfate", description: "Immune & skin support", about: "Essential mineral supplement supporting immune function, wound healing, and skin health.", details: ["Zinc Sulfate 50mg", "Tablet", "Immune Support", "Skin Health", "30 tablets"], price: 150, category: "vitamins", inStock: false },
  { id: 10, name: "Hand Sanitizer 500ml", genericName: "Ethyl Alcohol 70%", description: "70% alcohol, kills 99.9% germs", about: "Quick-drying hand sanitizer with moisturizer, effective against most common germs and bacteria.", details: ["Ethyl Alcohol 70% solution", "500ml pump bottle", "Antiseptic", "Kills 99.9% of germs"], price: 95, category: "personal-care", inStock: true },
  { id: 11, name: "Antibacterial Soap", genericName: "Triclocarban Soap", description: "Gentle daily cleansing bar", about: "Antibacterial bar soap for everyday hand and body cleansing, gentle enough for daily use.", details: ["Triclocarban 1.5%", "135g bar", "Antibacterial", "Daily Cleansing"], price: 65, category: "personal-care", inStock: true },
  { id: 12, name: "Rubbing Alcohol 500ml", genericName: "Isopropyl Alcohol 70%", description: "70% isopropyl alcohol", about: "General-purpose antiseptic solution for skin disinfection and first aid use.", details: ["Isopropyl Alcohol 70% solution", "500ml bottle", "Antiseptic", "First Aid Use"], price: 60, category: "personal-care", inStock: true },
  { id: 13, name: "Cotton Buds (100pcs)", genericName: "Cotton Swabs", description: "Soft double-tipped swabs", about: "Soft, double-tipped cotton swabs for personal care and first aid application.", details: ["Double-tipped cotton swabs", "100 pieces per pack", "Personal Care"], price: 45, category: "personal-care", inStock: true },
  { id: 14, name: "Face Mask (50pcs)", genericName: "Disposable Surgical Mask", description: "3-ply disposable surgical mask", about: "3-ply disposable face mask offering basic protection against dust and airborne particles.", details: ["3-ply non-woven fabric", "50 pieces per box", "Disposable", "Ear-loop style"], price: 150, category: "personal-care", inStock: true },
  { id: 15, name: "Digital Thermometer", genericName: "Digital Clinical Thermometer", description: "Fast, accurate temperature reading", about: "Digital thermometer with fast readout and memory recall for home temperature monitoring.", details: ["Digital display", "Fast 10-second reading", "Water-resistant", "Includes memory recall"], price: 250, category: "health-wellness", inStock: true },
  { id: 16, name: "Blood Pressure Monitor", genericName: "Automatic Digital BP Monitor", description: "Automatic digital BP monitor", about: "Fully automatic upper-arm blood pressure monitor with large, easy-to-read digital display.", details: ["Automatic inflation", "Digital LCD display", "Irregular heartbeat detection", "Stores up to 90 readings"], price: 1450, category: "health-wellness", inStock: true },
  { id: 17, name: "Pulse Oximeter", genericName: "Fingertip Pulse Oximeter", description: "Blood oxygen & pulse rate monitor", about: "Fingertip device for quick, non-invasive monitoring of blood oxygen saturation (SpO2) and pulse rate.", details: ["Measures SpO2 & pulse rate", "OLED display", "Auto power-off", "Includes lanyard"], price: 650, category: "health-wellness", inStock: true },
  { id: 18, name: "First Aid Kit", genericName: "Home First Aid Kit", description: "Essential home first aid supplies", about: "Compact kit with essential supplies for treating minor cuts, wounds, and injuries at home.", details: ["Bandages & gauze", "Antiseptic wipes", "Adhesive tape", "Scissors & tweezers"], price: 480, category: "health-wellness", inStock: true },
  { id: 19, name: "Elastic Bandage", genericName: "Elastic Compression Bandage", description: "Sports & injury support wrap", about: "Stretchable compression bandage for sprains, strains, and general joint support.", details: ["Self-adhesive elastic wrap", "7.5cm x 4.5m", "Reusable", "Sports & Injury Support"], price: 85, category: "health-wellness", inStock: true },
  { id: 20, name: "Nebulizer Machine", genericName: "Compressor Nebulizer", description: "Compact home respiratory therapy", about: "Compact compressor nebulizer for home respiratory therapy, suitable for both adults and children.", details: ["Compressor-driven", "Includes adult & child masks", "Low noise operation", "1-year warranty"], price: 1850, category: "health-wellness", inStock: true },
];

const CATEGORY_LABELS = {
  otc: "OTC Medicines",
  vitamins: "Vitamins & Supplements",
  "personal-care": "Personal Care",
  "health-wellness": "Health & Wellness",
};

function formatPeso(amount) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

function getProductById(id) {
  return SAMPLE_PRODUCTS.find((p) => String(p.id) === String(id));
}

function renderProductCard(product) {
  return `
    <div class="col">
      <div class="product-card">
        <a href="product-details.html?id=${product.id}" class="product-image-link">
          <div class="product-image"></div>
        </a>
        <a href="product-details.html?id=${product.id}" class="product-name-link">
          <h3 class="product-name">${product.name}</h3>
        </a>
        <p class="product-desc">${product.description}</p>
        <p class="product-price">${formatPeso(product.price)}</p>
        <button type="button" class="btn btn-amson w-100 btn-add-cart" data-id="${product.id}">+ Add to Cart</button>
      </div>
    </div>
  `;
}
