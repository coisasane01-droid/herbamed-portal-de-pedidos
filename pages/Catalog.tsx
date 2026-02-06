import { useEffect, useState } from "react";

// ✅ CAMINHOS CORRETOS (2 níveis, não 3)
import Layout from "../components/components/Layout";
import PromoCategoryCarousel from "../components/components/PromoCategoryCarousel";
import PromoCategoryPopup from "../components/components/PromoCategoryPopup";
import IsolatedProductCard from "../components/components/IsolatedProductCard";

import { supabase } from "../lib/supabase";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) {
      setProducts(data);
    }

    setLoading(false);
  }

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <PromoCategoryCarousel
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setShowPromoPopup(true);
          }}
        />

        {showPromoPopup && (
          <PromoCategoryPopup
            category={selectedCategory}
            onClose={() => setShowPromoPopup(false)}
          />
        )}

        {loading ? (
          <p className="text-center text-gray-500">
            Carregando produtos...
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-gray-400">
            Nenhum produto encontrado
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <IsolatedProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
