import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Package, Search, Plus } from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { recommendationsApi } from '@/api/recommendations.api';
import { toast } from 'sonner';

interface RecommendationModalProps {
  appointmentId: string;
  onClose: () => void;
}

export function RecommendationModal({ appointmentId, onClose }: RecommendationModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [pendingComment, setPendingComment] = useState('');

  // One-time recommendation
  const [oneTimeName, setOneTimeName] = useState('');
  const [oneTimeComment, setOneTimeComment] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: (data: { productId?: string; name: string; comment?: string }) =>
      recommendationsApi.add(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'panel', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setPendingProductId(null);
      setPendingComment('');
      setOneTimeName('');
      setOneTimeComment('');
      toast.success('Rekomendacja dodana');
    },
    onError: () => toast.error('Nie udało się dodać rekomendacji'),
  });

  const filtered = products.filter(
    (p) =>
      p.isActive &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddProduct = (productId: string, productName: string) => {
    if (pendingProductId === productId) {
      // confirm
      addMutation.mutate({ productId, name: productName, comment: pendingComment || undefined });
    } else {
      setPendingProductId(productId);
      setPendingComment('');
    }
  };

  const handleAddOneTime = () => {
    if (!oneTimeName.trim()) {
      toast.error('Podaj nazwę produktu');
      return;
    }
    addMutation.mutate({ name: oneTimeName.trim(), comment: oneTimeComment.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-base">Poleć produkty</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Catalog section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Z katalogu
            </p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Szukaj produktu..."
              />
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Brak produktów</p>
              )}
              {filtered.map((product) => (
                <div key={product.id} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
                      {product.imagePath ? (
                        <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-gray-200 m-2.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">
                        {product.brand ? `${product.brand} · ` : ''}{product.price.toFixed(2)} zł · {product.stock} szt.
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddProduct(product.id, product.name)}
                      disabled={addMutation.isPending}
                      className="flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      <Plus size={12} />
                      {pendingProductId === product.id ? 'Potwierdź' : 'Dodaj'}
                    </button>
                  </div>
                  {pendingProductId === product.id && (
                    <div className="px-3 pb-3 space-y-2">
                      <input
                        value={pendingComment}
                        onChange={(e) => setPendingComment(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Komentarz dla klienta (opcjonalny)..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPendingProductId(null)}
                          className="flex-1 border rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50"
                        >
                          Anuluj
                        </button>
                        <button
                          onClick={() => addMutation.mutate({ productId: product.id, name: product.name, comment: pendingComment || undefined })}
                          disabled={addMutation.isPending}
                          className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          {addMutation.isPending ? 'Dodawanie...' : 'Dodaj rekomendację'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* One-time section */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Jednorazowe polecenie
            </p>
            <div className="space-y-2">
              <input
                value={oneTimeName}
                onChange={(e) => setOneTimeName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Nazwa produktu..."
              />
              <input
                value={oneTimeComment}
                onChange={(e) => setOneTimeComment(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Komentarz dla klienta (opcjonalny)..."
              />
              <button
                onClick={handleAddOneTime}
                disabled={addMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 border border-dashed rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                Dodaj jednorazowo
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full border rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
