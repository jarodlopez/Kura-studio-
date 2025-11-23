import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  set
} from 'firebase/database';
import { 
  ShoppingBag, 
  X, 
  Menu, 
  User, 
  Zap, 
  Check,
  ArrowRight,
  MessageCircle,
  Plus,
  Minus,
  Maximize2,
  Package,
  Clock,
  ChevronDown,
  ChevronUp,
  LogOut
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
// IMPORTANTE: Estos son datos de ejemplo. En una aplicación real, reemplázalos con tus propios datos de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyDhIbUHfD8FARW9kz8ekqp5O0jqZQU7etc",
  authDomain: "kura-studio.firebaseapp.com",
  databaseURL: "https://kura-studio-default-rtdb.firebaseio.com",
  projectId: "kura-studio",
  storageBucket: "kura-studio.firebasestorage.app",
  messagingSenderId: "238358999866",
  appId: "1:238358999866:web:9fc2e446d816dae8981603",
  measurementId: "G-P6B46DN506"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- RUTA DEL LOGO ---
// Este path apunta al archivo 'logo.png' dentro de la carpeta 'public'
const LOGO_URL = "/logo.png";

// --- DATOS INICIALES (SEMILLA) ---
const SEED_PRODUCTS = [
  { id: 'p1', name: 'AKIRA T-SHIRT', price: 1200, category: 'Ropa', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=600', japanese: 'アキラ', description: 'Camiseta de algodón premium con estampado de alta densidad inspirado en Neo-Tokyo.' },
  { id: 'p2', name: 'CYBER MASK', price: 4500, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1550948537-130a1ce83314?auto=format&fit=crop&q=80&w=600', japanese: 'マスク', description: 'Máscara decorativa estilo cyberpunk. Acabado mate con detalles LED.' },
  { id: 'p3', name: 'KATANA UMBRELLA', price: 1500, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1533577318063-42e7d589d813?auto=format&fit=crop&q=80&w=600', japanese: '刀', description: 'Paraguas reforzado con mango estilo Katana tradicional. Resistente al viento.' },
  { id: 'p4', name: 'MECHA HOODIE', price: 2800, category: 'Ropa', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=600', japanese: 'メカ', description: 'Sudadera oversize con paneles técnicos y estética mecha.' },
  { id: 'p5', name: 'NEO TOKYO CAP', price: 850, category: 'Ropa', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600', japanese: '東京', description: 'Gorra snapback con bordado 3D de Kura Studio.' },
  { id: 'p6', name: 'GHOST SHELL FIG', price: 8900, category: 'Figuras', image: 'https://images.unsplash.com/photo-1614726365723-49fb9b563b27?auto=format&fit=crop&q=80&w=600', japanese: '幽霊', description: 'Figura de colección escala 1/7. Edición limitada.' },
];

// --- COMPONENTES UI REUTILIZABLES ---

const Button = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, disabled = false }) => {
  const baseStyle = "font-bold text-sm tracking-widest uppercase transition-all duration-200 border-2 border-black relative overflow-hidden group py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white hover:bg-red-600 hover:border-red-600",
    secondary: "bg-white text-black hover:bg-gray-100",
    outline: "bg-transparent text-black border-black hover:bg-black hover:text-white",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

const Badge = ({ children }) => (
  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 absolute top-2 right-2 z-10 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
    {children}
  </span>
);

const Price = ({ amount }) => (
  <span className="font-mono font-bold">C$ {amount.toLocaleString()}</span>
);

// --- COMPONENTE PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('home'); 
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todo');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  // --- AUTH & DATA SYNC ---
  useEffect(() => {
    // 1. Autenticación anónima para obtener un ID de usuario
    signInAnonymously(auth).catch(console.error);
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);

    // 2. Sincronización de productos desde Firebase Realtime Database
    const productsRef = ref(db, 'products');
    const unsubscribeDB = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProducts(productList);
      } else {
        // Si no hay productos en la BD, usa los datos semilla (SEED_PRODUCTS)
        setProducts(SEED_PRODUCTS);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDB();
    };
  }, []);

  // --- LOGICA DEL CARRITO ---
  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        // Si ya existe, actualiza la cantidad
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + quantity } : p);
      }
      // Si no existe, agrégalo
      return [...prev, { ...product, quantity }];
    });
    setSelectedProduct(null);
    setModalQuantity(1);
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(p => {
      if (p.id === productId) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // --- LOGICA DE CHECKOUT ---
  const handleCheckout = async (formData) => {
    setIsLoading(true);
    try {
      const orderId = `KURA-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderData = {
        orderId,
        items: cart,
        total: cartTotal,
        customer: formData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user ? user.uid : 'anonymous'
      };

      // Guardar la orden en Firebase Realtime Database
      const ordersRef = ref(db, 'orders');
      const newOrderRef = push(ordersRef); // Crea un ID único
      await set(newOrderRef, orderData);
      
      // Actualizar estado para la vista de éxito
      setLastOrder(orderData);
      setCart([]);
      setView('success');
    } catch (error) {
      console.error("Error placing order", error);
      // Usar un modal o un mensaje dentro del UI en lugar de alert()
      // Por simplicidad, aquí usamos console.error
      console.error("Hubo un error de conexión al realizar el pedido. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- SUBCOMPONENTES DE VISTA ---

  const Navbar = () => (
    <nav className="fixed top-0 left-0 w-full z-40 bg-white border-b-2 border-black h-20 flex items-center justify-between px-4 lg:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-1 hover:bg-black hover:text-white transition-colors">
          <Menu size={24} />
        </button>
        
        {/* --- LOGO --- */}
        <div 
          onClick={() => { setView('home'); setSelectedCategory('Todo'); }} 
          className="cursor-pointer select-none"
        >
          <img 
            src={LOGO_URL} 
            alt="KURA STUDIO" 
            className="h-14 w-auto object-contain"
            onError={(e) => {
              // Si el logo no carga, muestra el nombre de texto como fallback
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          {/* Respaldo de texto */}
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-1 hidden">
            <span className="text-red-600 text-3xl leading-none">●</span> KURA
          </h1>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-8 font-bold text-sm uppercase tracking-widest">
        {['Todo', 'Ropa', 'Figuras', 'Accesorios'].map(cat => (
          <button 
            key={cat}
            onClick={() => { setSelectedCategory(cat); setView('home'); }}
            className={`hover:text-red-600 transition-colors ${selectedCategory === cat ? 'text-red-600 underline underline-offset-4 decoration-2' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('profile')} 
          className={`p-2 transition-colors border-2 ${view === 'profile' ? 'bg-black text-white border-black' : 'border-transparent hover:border-black'}`}
        >
          <User size={24} />
        </button>

        <button onClick={() => setView('cart')} className="relative p-2 hover:bg-gray-100 transition-colors group border-l-2 border-transparent hover:border-black">
          <ShoppingBag size={24} className="group-hover:text-red-600 transition-colors"/>
          {cart.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white shadow-sm">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {isMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-white border-b-2 border-black p-4 flex flex-col gap-4 lg:hidden shadow-xl animate-in slide-in-from-top-10 z-50">
          {['Todo', 'Ropa', 'Figuras', 'Accesorios'].map(cat => (
            <button 
              key={cat}
              onClick={() => { setSelectedCategory(cat); setView('home'); setIsMenuOpen(false); }}
              className="text-left font-bold text-lg uppercase hover:text-red-600 border-b border-gray-100 pb-2"
            >
              {cat}
            </button>
          ))}
          <button 
            onClick={() => { setView('profile'); setIsMenuOpen(false); }}
            className="text-left font-bold text-lg uppercase hover:text-red-600 border-b border-gray-100 pb-2 flex items-center gap-2"
          >
            <User size={18} /> Mi Perfil
          </button>
        </div>
      )}
    </nav>
  );

  const ProfileView = () => {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
      if (!user) return;
      
      // Consultar las órdenes del usuario
      const ordersRef = ref(db, 'orders');
      const unsubscribe = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const userOrders = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            // Filtrar solo las órdenes de este usuario (usando el UID anónimo)
            .filter(order => order.userId === user.uid) 
            // Ordenar por fecha de creación (más reciente primero)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setOrders(userOrders);
        } else {
          setOrders([]);
        }
        setLoadingOrders(false);
      });

      return () => unsubscribe();
    }, [user]);

    const toggleOrder = (id) => {
      if (expandedOrder === id) setExpandedOrder(null);
      else setExpandedOrder(id);
    };

    if (!user) return (
      <div className="pt-32 text-center px-4">
        <h2 className="text-2xl font-black uppercase">Acceso Restringido</h2>
        <p className="mb-4">Por favor inicia sesión para ver tu perfil.</p>
        <Button onClick={() => setView('home')}>Volver al inicio</Button>
      </div>
    );

    return (
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-4 border-b-4 border-black gap-4">
           <div>
             <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-2">
               Mi Perfil <span className="text-red-600 text-5xl">.</span>
             </h2>
             {/* Mostrar el ID de usuario (solo 8 caracteres para mantener la estética, aunque es el UID completo) */}
             <p className="font-mono text-xs text-gray-500 mt-2 flex items-center gap-2">
               <User size={12}/> ID: {user.uid.slice(0, 8)}...
             </p>
           </div>
           <Button variant="outline" onClick={() => signOut(auth).then(()=>window.location.reload())}>
             <LogOut size={16} className="mr-2"/> Cerrar Sesión
           </Button>
         </div>

         <div className="space-y-8">
           <h3 className="text-xl font-bold uppercase tracking-widest border-l-4 border-red-600 pl-4">Historial de Órdenes</h3>
           
           {loadingOrders ? (
             <div className="text-center py-10 font-mono text-gray-400 animate-pulse">CARGANDO DATA...</div>
           ) : orders.length === 0 ? (
             <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-10 text-center">
               <Package size={48} className="mx-auto text-gray-300 mb-4" />
               <p className="font-bold text-gray-500 uppercase">No tienes órdenes registradas.</p>
               <Button className="mt-4" onClick={() => setView('home')}>Ir a comprar</Button>
             </div>
           ) : (
             <div className="space-y-4">
               {orders.map((order) => (
                 <div key={order.id} className="border-2 border-black bg-white transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                   <div 
                     onClick={() => toggleOrder(order.id)}
                     className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 hover:bg-white transition-colors"
                   >
                     <div className="flex items-center gap-4">
                       <div className="bg-black text-white p-3">
                         <Package size={24} />
                       </div>
                       <div>
                         <h4 className="font-black text-xl font-mono">{order.orderId}</h4>
                         <p className="text-xs text-gray-500 flex items-center gap-1 uppercase font-bold tracking-wider">
                           <Clock size={10} /> {new Date(order.createdAt).toLocaleDateString()} 
                         </p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Total</p>
                          <p className="font-black text-lg text-red-600"><Price amount={order.total} /></p>
                        </div>
                        {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                     </div>
                   </div>

                   {expandedOrder === order.id && (
                     <div className="border-t-2 border-black p-6 animate-in slide-in-from-top-2">
                       <div className="mb-4">
                          <p className="text-xs font-bold uppercase mb-1">Dirección de Envío:</p>
                          <p className="text-sm font-mono text-gray-600">{order.customer.address}, {order.customer.city}</p>
                       </div>
                       
                       <div className="space-y-3">
                         {order.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2">
                             <div className="flex items-center gap-3">
                               <img src={item.image} alt={item.name} className="w-10 h-10 object-cover border border-black grayscale" />
                               <div>
                                 <p className="font-bold text-sm uppercase">{item.name}</p>
                                 <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                               </div>
                             </div>
                             <p className="font-mono font-bold text-sm"><Price amount={item.price * item.quantity} /></p>
                           </div>
                         ))}
                       </div>

                       <div className="mt-6 flex justify-end">
                          <Button 
                            variant="outline" 
                            className="text-xs py-2 px-4"
                            onClick={() => {
                              const whatsappMessage = encodeURIComponent(`Hola, consulto por mi orden ${order.orderId}...`);
                              window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
                            }}
                          >
                            <MessageCircle size={14} className="mr-2"/> Contactar Soporte
                          </Button>
                       </div>
                     </div>
                   )}
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    );
  };

  const ProductModal = () => {
    if (!selectedProduct) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-black shadow-[16px_16px_0px_0px_#ff0000] relative flex flex-col md:flex-row">
          
          <button 
            onClick={() => setSelectedProduct(null)}
            className="absolute top-4 right-4 z-10 bg-white border-2 border-black p-1 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="w-full md:w-1/2 bg-gray-100 border-b-2 md:border-b-0 md:border-r-2 border-black relative group">
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name} 
              className="w-full h-full object-cover aspect-square"
            />
            <div className="absolute bottom-4 left-4 bg-black text-white px-3 py-1 font-mono text-xl md:text-3xl font-black opacity-90">
              {selectedProduct.japanese}
            </div>
          </div>

          <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">
            <div className="mb-auto">
              <span className="text-red-600 font-bold tracking-widest text-xs uppercase mb-2 block">{selectedProduct.category}</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase leading-none mb-4">{selectedProduct.name}</h2>
              <div className="text-2xl md:text-3xl font-mono font-bold mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                <Price amount={selectedProduct.price} />
              </div>
              <p className="text-gray-600 font-medium leading-relaxed mb-8 text-sm md:text-base">
                {selectedProduct.description || "Producto exclusivo de la colección KURA STUDIO. Calidad garantizada para el estilo de vida urbano."}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="font-bold text-xs uppercase tracking-wider">Cantidad:</span>
                <div className="flex items-center border-2 border-black">
                  <button 
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    className="p-3 hover:bg-black hover:text-white transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-mono font-bold text-lg">{modalQuantity}</span>
                  <button 
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    className="p-3 hover:bg-black hover:text-white transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <Button 
                fullWidth 
                onClick={() => addToCart(selectedProduct, modalQuantity)}
                className="text-lg py-4"
              >
                Agregar al Carrito <Zap size={20} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProductList = () => {
    const filtered = selectedCategory === 'Todo' 
      ? products 
      : products.filter(p => p.category === selectedCategory);

    return (
      <div id="shop" className="max-w-7xl mx-auto px-4 py-12 md:py-24">
        <div className="flex items-end justify-between mb-12 border-b-4 border-black pb-4">
          <h3 className="text-4xl font-black uppercase tracking-tighter">
            Catálogo <span className="text-red-600 text-5xl">.</span>
          </h3>
          <span className="font-mono text-xs font-bold border border-black px-2 py-1 hidden md:block">
            {filtered.length} ITEMS
          </span>
        </div>
        
        {filtered.length === 0 ? (
           <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300">
             <p className="font-mono text-gray-400">Cargando inventario o categoría vacía...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {filtered.map(product => (
              <div 
                key={product.id} 
                className="group relative bg-white transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                onClick={() => {
                  setSelectedProduct(product);
                  setModalQuantity(1);
                }}
              >
                <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-300"></div>
                
                <div className="relative border-2 border-black bg-white h-full flex flex-col">
                  <Badge>{product.category}</Badge>
                  <div className="aspect-[4/5] w-full overflow-hidden border-b-2 border-black relative bg-gray-100">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/10 transition-colors duration-300"></div>
                    <div className="absolute bottom-0 left-0 bg-black text-white text-xs px-3 py-1 font-mono font-bold">
                      {product.japanese}
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <div className="bg-white border-2 border-black p-3 rounded-full shadow-lg">
                         <Maximize2 size={24} />
                       </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="font-black text-xl leading-none uppercase mb-1 group-hover:text-red-600 transition-colors">
                        {product.name}
                      </h4>
                      <div className="w-10 h-1 bg-black mt-2 mb-3"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <Price amount={product.price} />
                      <span className="text-xs font-bold underline decoration-2 underline-offset-2">VER DETALLE</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CartView = () => (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l-4 border-black animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b-2 border-black flex justify-between items-center bg-white">
          <h2 className="text-3xl font-black uppercase flex items-center gap-2">
            Carrito <span className="bg-red-600 text-white text-sm px-2 py-1 rounded-none border border-black">{cart.reduce((a,b)=>a+b.quantity,0)}</span>
          </h2>
          <button onClick={() => setView('home')} className="hover:rotate-90 transition-transform p-1 hover:bg-black hover:text-white rounded-full"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6 opacity-50">
              <ShoppingBag size={80} strokeWidth={1} />
              <p className="font-mono text-sm uppercase tracking-widest">Tu carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 border-2 border-gray-100 p-2 hover:border-black transition-colors bg-gray-50">
                <img src={item.image} className="w-20 h-24 object-cover border border-black" />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-bold text-sm uppercase leading-tight">{item.name}</h4>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{item.category}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 border border-black bg-white">
                      <button onClick={() => updateQuantity(item.id, -1)} className="px-2 hover:bg-gray-200">-</button>
                      <span className="font-mono text-xs w-4 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="px-2 hover:bg-gray-200">+</button>
                    </div>
                    <Price amount={item.price * item.quantity} />
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-600 self-start">
                  <X size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t-2 border-black bg-gray-50 space-y-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-end font-black text-2xl">
              <span>TOTAL</span>
              <span className="text-red-600"><Price amount={cartTotal} /></span>
            </div>
            <p className="text-[10px] text-gray-500 text-right uppercase tracking-widest">Envío calculado en checkout</p>
            <Button fullWidth onClick={() => setView('checkout')} className="py-4 text-lg">
              Proceder al Pago <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const CheckoutView = () => {
    const [formData, setFormData] = useState({ name: '', address: '', phone: '', city: '' });

    const handleSubmit = (e) => {
      e.preventDefault();
      handleCheckout(formData);
    };

    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">
        <button onClick={() => setView('cart')} className="mb-8 flex items-center gap-2 hover:text-red-600 font-bold text-xs uppercase tracking-widest group">
          <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={16} /> Volver al Carrito
        </button>
        
        <div className="bg-white border-4 border-black p-8 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">
          <div className="absolute top-0 left-0 w-full h-4 bg-stripes opacity-10"></div>
          
          <h2 className="text-4xl font-black uppercase mb-10 border-b-4 border-black pb-4 flex items-center gap-4">
            Checkout <span className="text-red-600 text-base font-mono align-middle tracking-normal">SECURE //</span>
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <User size={12}/> Nombre Completo
                </label>
                <input required className="w-full border-2 border-black p-4 font-bold focus:outline-none focus:border-red-600 focus:shadow-[4px_4px_0px_0px_#ef4444] transition-all bg-gray-50" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Akira Toriyama" />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <MessageCircle size={12}/> Teléfono / WhatsApp
                </label>
                <input required className="w-full border-2 border-black p-4 font-bold focus:outline-none focus:border-red-600 focus:shadow-[4px_4px_0px_0px_#ef4444] transition-all bg-gray-50" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+505 8888 8888" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="font-bold text-xs uppercase tracking-widest">Dirección de Envío</label>
              <input required className="w-full border-2 border-black p-4 font-bold focus:outline-none focus:border-red-600 focus:shadow-[4px_4px_0px_0px_#ef4444] transition-all bg-gray-50" 
                value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Dirección exacta, casa, calle..." />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-xs uppercase tracking-widest">Ciudad / Departamento</label>
              <input required className="w-full border-2 border-black p-4 font-bold focus:outline-none focus:border-red-600 focus:shadow-[4px_4px_0px_0px_#ef4444] transition-all bg-gray-50" 
                value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Managua, León, Granada..." />
            </div>

            <div className="pt-10 border-t-2 border-dashed border-gray-300">
               <div className="flex justify-between items-center mb-8">
                 <span className="font-bold text-gray-500 uppercase tracking-widest">Total a pagar:</span>
                 <span className="font-black text-4xl"><Price amount={cartTotal} /></span>
               </div>
               <Button fullWidth variant="primary" disabled={isLoading} className="text-xl py-5 shadow-[8px_8px_0px_0px_#333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                 {isLoading ? 'PROCESANDO...' : 'CONFIRMAR ORDEN'}
               </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const SuccessView = () => {
    if (!lastOrder) return null;

    const whatsappMessage = encodeURIComponent(
      `*NUEVO PEDIDO KURA STUDIO*\n` +
      `--------------------------\n` +
      `🆔 Orden: ${lastOrder.orderId}\n` +
      `👤 Cliente: ${lastOrder.customer.name}\n` +
      `📍 Dirección: ${lastOrder.customer.address}, ${lastOrder.customer.city}\n` +
      `--------------------------\n` +
      `🛒 *ITEMS:*\n${lastOrder.items.map(i => `▪ ${i.name} (x${i.quantity})`).join('\n')}\n` +
      `--------------------------\n` +
      `💰 *TOTAL: C$ ${lastOrder.total.toLocaleString()}*\n` +
      `--------------------------\n` +
      `Espero confirmación de envío. Gracias.`
    );

    const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

    return (
      <div className="min-h-screen pt-24 flex items-center justify-center p-4 bg-dots">
        <div className="max-w-lg w-full bg-white border-4 border-black p-10 text-center space-y-8 shadow-[12px_12px_0px_0px_#ef4444] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
          
          <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-xl">
            <Check size={48} strokeWidth={3} />
          </div>
          
          <div>
            <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">¡Arigato!</h2>
            <p className="text-gray-600 font-medium font-mono uppercase tracking-widest text-xs">Orden recibida correctamente</p>
          </div>
          
          <div className="bg-gray-50 p-6 border-2 border-dashed border-black">
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Código de Orden</p>
            <p className="text-4xl font-mono font-black tracking-widest text-red-600 selection:bg-black selection:text-white">{lastOrder.orderId}</p>
          </div>

          <p className="text-sm px-4">
            Para finalizar tu compra, envía el detalle de tu orden a nuestro WhatsApp oficial para coordinar el pago y entrega.
          </p>

          <Button fullWidth variant="primary" onClick={() => window.open(whatsappUrl, '_blank')} className="py-4 text-lg bg-[#25D366] border-[#25D366] hover:bg-black hover:border-black text-white">
            <MessageCircle className="mr-2 fill-white" /> Enviar Pedido
          </Button>
          
          <Button fullWidth variant="outline" onClick={() => setView('home')}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  };

  const Hero = () => (
    <div className="w-full h-[60vh] lg:h-[75vh] bg-black text-white relative overflow-hidden flex items-center justify-center border-b-4 border-black mt-20">
      <div className="absolute top-10 left-10 text-[10rem] opacity-5 font-black select-none pointer-events-none text-red-600 leading-none writing-vertical-rl hidden lg:block">アニメ</div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Decorative Circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-red-600 rounded-full opacity-20 animate-spin-slow pointer-events-none"></div>

      <div className="relative z-10 text-center space-y-8 max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
        <div className="inline-block bg-white text-black px-4 py-1 font-black text-sm tracking-[0.4em] mb-4 transform -skew-x-12">NICARAGUA 2025</div>
        <h2 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
          STREETWEAR <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-600 to-red-900" style={{ WebkitTextStroke: '0px' }}>REVOLUTION</span>
        </h2>
        <div className="flex justify-center gap-4 pt-8">
          <Button variant="secondary" onClick={() => document.getElementById('shop').scrollIntoView({ behavior: 'smooth' })}>
            Explorar Colección
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-red-600 selection:text-white pb-20">
      {view !== 'success' && <Navbar />}
      
      {view === 'home' && (
        <>
          <Hero />
          <ProductList />
          <ProductModal />
        </>
      )}
      
      {view === 'cart' && <CartView />}
      {view === 'checkout' && <CheckoutView />}
      {view === 'success' && <SuccessView />}
      {view === 'profile' && <ProfileView />}
      
      <footer className="bg-black text-white py-16 px-4 border-t-8 border-red-600 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            {/* Logo en footer también */}
            <div className="mb-4 flex justify-center md:justify-start">
               <img src={LOGO_URL} className="h-20 w-auto invert brightness-0" alt="Kura Studio Logo" onError={(e) => e.target.style.display = 'none'} />
            </div>
            <h2 className="text-4xl font-black mb-2">KURA STUDIO</h2>
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">Design for the modern ronin.</p>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-white text-black hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center font-bold cursor-pointer">IG</div>
            <div className="w-10 h-10 bg-white text-black hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center font-bold cursor-pointer">FB</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

