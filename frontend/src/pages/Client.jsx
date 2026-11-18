import { useState, useEffect } from 'react';
import { api, API_URL } from '../services/api';
import { connectSocket } from '../services/socket';
import { ShoppingCart, Clock, ChefHat } from 'lucide-react';
import { getMenuImage } from '../utils/images';

export default function Client() {
  const [queue, setQueue] = useState({ currentServing: 0, queue: [] });
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [myTicket, setMyTicket] = useState(null);
  const [myTicketNumber, setMyTicketNumber] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientUid, setClientUid] = useState('');

  console.log('Client render, queue.currentServing:', queue.currentServing);

  // Génère ou récupère le client_uid depuis localStorage
  useEffect(() => {
    let uid = localStorage.getItem('client_uid');
    if (!uid) {
      uid = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('client_uid', uid);
    }
    console.log('Client UID set:', uid);
    setClientUid(uid);
  }, []);

  // Charge données
  useEffect(() => {
    if (!clientUid) return;
    console.log('Loading data for client:', clientUid);
    loadMenu();
    loadQueue();

    const socket = connectSocket();
    socket.emit('join_client_room', clientUid);
    socket.on('queue_update', () => {
      console.log('Queue update received');
      loadQueue();
      loadMenu();
    });

    return () => socket.off('queue_update');
  }, [clientUid]);

  const loadMenu = async () => {
    try {
      const data = await api.getMenu();
      console.log('Menu data:', data);
      setMenu(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur menu:', e);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQueue = async () => {
    try {
      const data = await api.getQueue();
      console.log('Queue data:', data);
      setQueue(data || { currentServing: 0, queue: [] });
    } catch (e) {
      console.error('Erreur queue:', e);
      setQueue({ currentServing: 0, queue: [] });
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { menu_item_id: item.id, name: item.name, price: item.price_cents / 100, quantity: 1 }]);
    }
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      const order = await api.createOrder({ 
        items: cart, 
        customer_name: 'Client', 
        client_uid: clientUid 
      });
      setMyTicket(order.id);
      setMyTicketNumber(order.ticket_number || order.id);
      setCart([]);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    } catch (e) {
      console.error('Erreur:', e);
    }
  };

  const myOrder = queue.queue.find(q => q.id === myTicket);
  const displayOrderNumber = myOrder?.ticket_number || myTicketNumber || myTicket;
  const myOrderStatus = myOrder?.status || (myTicket ? 'PENDING' : null);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-8">
      {displayOrderNumber && (
        <>
          <div className="fixed top-16 md:top-20 inset-x-0 z-40 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className={`card border-l-4 ${myOrderStatus === 'READY' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-green-500' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-500'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm sm:text-base font-semibold text-slate-800">
                    Votre commande: <span className="text-lg font-bold">#{displayOrderNumber}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold">
                    {myOrderStatus === 'READY' ? 'Pret a retirer' : 'En cours'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-20 md:h-24" />
        </>
      )}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass rounded-2xl overflow-hidden h-72 md:h-96 relative group">
          <img src="/asset/Images/logo.png" alt="GLesCrocs" className="absolute inset-0 w-full h-full object-contain bg-white" />
        </div>
        <div className="space-y-4">
          <div className="card h-full bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs font-bold text-slate-700 mb-2">File d'attente ({queue.queue.length})</p>
              {queue.queue.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Aucune commande</p>
              ) : (
                queue.queue.slice(0, 8).map((order, idx) => (
                  <div key={order.id} className={`text-xs p-2 rounded border ${
                    idx === 0 ? 'bg-yellow-100 border-yellow-300 font-bold' :
                    order.status === 'READY' ? 'bg-green-100 border-green-300' :
                    order.status === 'PREPARING' ? 'bg-orange-100 border-orange-300' :
                    'bg-blue-100 border-blue-300'
                  }`}>
                    <span className="font-semibold">#{order.ticket_number || order.id}</span>
                    {order.status === 'READY' && ' Prêt!'}
                    {order.status === 'PREPARING' && ' Prep'}
                    {order.status === 'VALIDATED' && ' Validé'}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showNotification && (
        <div className="animate-slide-in card bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="font-bold text-green-700">Commande créée!</h3>
              <p className="text-sm text-green-600">Votre commande: <strong>#{displayOrderNumber}</strong></p>
            </div>
          </div>
        </div>
      )}

      {myTicket && myOrder && (
        <div className={`card ${myOrder.status === 'READY' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-green-500' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-500'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div>
                <h3 className={`text-xl font-bold ${myOrder.status === 'READY' ? 'text-green-700' : 'text-orange-700'}`}>
                  {myOrder.status === 'READY' ? 'Prêt !' : 'En cours...'} - Commande <span className="text-3xl">#{displayOrderNumber}</span>
                </h3>
                {myOrder.estimated_wait_seconds && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" /> {Math.round(myOrder.estimated_wait_seconds / 60)} min
                  </p>
                )}
              </div>
            </div>
            {myOrder.status === 'READY' && (
              <span className="badge-success animate-pulse flex items-center gap-2">
                <ChefHat className="w-4 h-4" /> Prêt!
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          Menu
        </h2>
        {loading ? (
          <div className="text-center py-12"><p className="text-slate-600">Chargement...</p></div>
        ) : menu.length === 0 ? (
          <div className="text-center py-12"><p className="text-slate-600">Menu indisponible</p></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menu.map(item => (
              <div key={item.id} className="card group">
                <div className="h-48 rounded-lg mb-4 overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img 
                    src={item.image_url ? `${API_URL}${item.image_url}` : getMenuImage(item.name)} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.src = getMenuImage(item.name);
                      e.target.onerror = null;
                    }}
                  />
                </div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xl font-bold text-accent-600">{(item.price_cents / 100).toFixed(2)}€</span>
                  <button onClick={() => addToCart(item)} className="btn-primary rounded-full px-4 py-2">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-l-4 border-primary-500 sticky bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Panier ({cart.length})
            </h4>
            <button onClick={() => setCart([])} className="text-xs text-slate-500 hover:text-slate-700 underline">Vider</button>
          </div>
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-white rounded-lg p-3 border">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-slate-600 ml-2">x{item.quantity}</span>
                </div>
                <span className="font-bold text-primary-600">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border-2 border-primary-300">
            <span className="font-bold">Total:</span>
            <span className="text-2xl font-bold text-accent-600">{totalPrice.toFixed(2)}€</span>
          </div>
          <button onClick={submitOrder} className="btn-primary w-full text-lg">Commander</button>
        </div>
      )}
    </div>
  );
}

