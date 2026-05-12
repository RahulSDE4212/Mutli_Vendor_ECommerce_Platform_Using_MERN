import React, { useState } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useAppContext } from '../Context/AppContext';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  const { wishlist, removeFromWishlist, addToCart } = useAppContext();
  const [removingId, setRemovingId] = useState(null);

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>
      
      {wishlist.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-lg mb-4">Your wishlist is empty.</p>
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-bold">Explore Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlist.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 group">
              <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-gray-100">
                <Link to={`/product/${product.id}`}>
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </Link>
                <button
                  onClick={() => handleRemove(product.id)}
                  disabled={removingId === product.id}
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div>
                <Link to={`/product/${product.id}`}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-indigo-600">{product.name}</h3>
                </Link>
                <p className="text-lg font-bold text-indigo-600 mb-4">₹{product.price.toFixed(2)}</p>
                <button
                  onClick={() => addToCart(product, 1, product.sizes?.[0])}
                  className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-full font-bold hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;

