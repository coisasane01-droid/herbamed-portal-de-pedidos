import { useState } from "react";
import Layout from "../components/components/Layout";
import IsolatedProductCard from "../components/components/IsolatedProductCard";
import PromoCategoryPopup from "../components/components/PromoCategoryPopup";

const Catalog = () => {
  const [promoOpen, setPromoOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const openPromo = (category: string) => {
    setSelectedCategory(category);
    setPromoOpen(true);
  };

  const closePromo = () => {
    setPromoOpen(false);
    setSelectedCategory(null);
  };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Catálogo de SKUs</h1>
            <p className="text-sm text-gray-500">
              Gestão de produtos industriais
            </p>
          </div>

          <button
            onClick={() => openPromo("Promoções")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
          >
            NOVO SKU
          </button>
        </div>

        {/* LISTAGEM DE PRODUTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <IsolatedProductCard />
          <IsolatedProductCard />
          <IsolatedProductCard />
        </div>
      </div>

      {/* POPUP DE CATEGORIA */}
      {promoOpen && selectedCategory && (
        <PromoCategoryPopup
          category={selectedCategory}
          onClose={closePromo}
        />
      )}
    </Layout>
  );
};

export default Catalog;
