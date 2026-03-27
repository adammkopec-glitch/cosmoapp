import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Plus, Edit2, Trash2, Save, X, Package } from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { toast } from 'sonner';

interface AssortmentPageProps {
  canDelete: boolean;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Brak</span>
    );
  if (stock < 5)
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        {stock} szt.
      </span>
    );
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      {stock} szt.
    </span>
  );
}

function ProductModal({
  product,
  onClose,
  onSave,
  isSaving,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [stock, setStock] = useState(product?.stock?.toString() ?? '0');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imagePath ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error('Nazwa i cena są wymagane');
      return;
    }
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('brand', brand.trim());
    fd.append('description', description.trim());
    fd.append('price', price);
    fd.append('stock', stock);
    fd.append('isActive', String(isActive));
    if (imageFile) fd.append('image', imageFile);
    onSave(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-base">
            {product ? 'Edytuj produkt' : 'Dodaj produkt'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Image */}
          <div
            className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <div className="text-center">
                <Package size={28} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Kliknij, aby dodać zdjęcie</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nazwa *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nazwa produktu"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Marka</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Np. LIRENE"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Opis</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
              placeholder="Krótki opis..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Cena (zł) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Stan</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <span>Aktywny (widoczny w katalogu)</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  canDelete,
  onEdit,
  onDelete,
}: {
  product: Product;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [stockInput, setStockInput] = useState(product.stock.toString());

  const stockMutation = useMutation({
    mutationFn: (stock: number) => productsApi.updateStock(product.id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stan zaktualizowany');
    },
    onError: () => toast.error('Nie udało się zaktualizować stanu'),
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.imagePath ? (
          <img src={product.imagePath} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package size={40} className="text-gray-200" />
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2">{product.name}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              {canDelete && (
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          {product.brand && <p className="text-xs text-primary font-medium mt-0.5">{product.brand}</p>}
        </div>

        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
        )}

        {/* Price + stock */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{product.price.toFixed(2)} zł</span>
          <StockBadge stock={product.stock} />
        </div>

        {/* Stock editor */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            className="flex-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => stockMutation.mutate(Number(stockInput))}
            disabled={stockMutation.isPending}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Save size={12} />
            Zapisz
          </button>
        </div>

        {!product.isActive && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Nieaktywny</span>
        )}
      </div>
    </div>
  );
}

export function AssortmentPage({ canDelete }: AssortmentPageProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      toast.success('Produkt dodany');
    },
    onError: () => toast.error('Nie udało się dodać produktu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      productsApi.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      toast.success('Produkt zaktualizowany');
    },
    onError: () => toast.error('Nie udało się zaktualizować produktu'),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produkt usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć produktu'),
  });

  const handleSave = (formData: FormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingBag size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Asortyment</h1>
            <p className="text-sm text-muted-foreground">{products.length} produktów w katalogu</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Dodaj produkt
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-72 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-1">Brak produktów</h3>
          <p className="text-sm text-gray-400">Dodaj pierwszy produkt do katalogu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canDelete={canDelete}
              onEdit={() => { setEditingProduct(product); setModalOpen(true); }}
              onDelete={() => {
                if (window.confirm(`Usunąć "${product.name}"?`)) {
                  deleteMutation.mutate(product.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {(modalOpen || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => { setModalOpen(false); setEditingProduct(null); }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
