import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Receipt, 
  History, 
  Plus, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Edit2,
  ArrowUpDown,
  LogOut, 
  AlertTriangle,
  TrendingUp,
  Box,
  User,
  ChevronRight,
  Download,
  FileText,
  ClipboardList,
  Truck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  query, 
  orderBy, 
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
  serialNumbers: string[];
}

interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  serialNumbers: string[];
}

interface Invoice {
  id: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  total: number;
  createdAt: any;
  createdBy: string;
}

interface StockLog {
  id: string;
  productId: string;
  change: number;
  type: 'sale' | 'restock' | 'adjustment';
  timestamp: any;
  note: string;
}

interface PurchaseOrder {
  id: string;
  supplierName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'received' | 'cancelled';
  createdAt: any;
  createdBy: string;
}

interface ProformaInvoice {
  id: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: any;
  createdAt: any;
  createdBy: string;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-zinc-900 text-white shadow-lg' 
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend }: { label: string, value: string | number, icon: any, trend?: string }) => (
  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
        <Icon size={20} className="text-zinc-900" />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-zinc-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-zinc-900">{value}</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'billing' | 'history' | 'purchase-orders' | 'proforma'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const qInvoices = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    });

    const qPO = query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc'));
    const unsubPO = onSnapshot(qPO, (snapshot) => {
      setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
    });

    const qProforma = query(collection(db, 'proformaInvoices'), orderBy('createdAt', 'desc'));
    const unsubProforma = onSnapshot(qProforma, (snapshot) => {
      setProformaInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProformaInvoice)));
    });

    return () => {
      unsubProducts();
      unsubInvoices();
      unsubPO();
      unsubProforma();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl text-center"
        >
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Box size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2 italic serif">StockMaster Pro</h1>
          <p className="text-zinc-500 mb-8">Professional Inventory & Billing Management</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-zinc-800 transition-colors shadow-lg"
          >
            <User size={20} />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Box size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight italic">StockMaster</span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Package} 
            label="Inventory" 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
          />
          <SidebarItem 
            icon={Receipt} 
            label="Billing" 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')} 
          />
          <SidebarItem 
            icon={ClipboardList} 
            label="Purchase Orders" 
            active={activeTab === 'purchase-orders'} 
            onClick={() => setActiveTab('purchase-orders')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Proforma Invoices" 
            active={activeTab === 'proforma'} 
            onClick={() => setActiveTab('proforma')} 
          />
          <SidebarItem 
            icon={History} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-zinc-200" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{user.displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <Dashboard products={products} invoices={invoices} />}
          {activeTab === 'inventory' && <Inventory products={products} />}
          {activeTab === 'billing' && <Billing products={products} user={user} />}
          {activeTab === 'purchase-orders' && <PurchaseOrdersView products={products} purchaseOrders={purchaseOrders} user={user} />}
          {activeTab === 'proforma' && <ProformaView products={products} proformaInvoices={proformaInvoices} user={user} />}
          {activeTab === 'history' && <HistoryView invoices={invoices} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function Dashboard({ products, invoices }: { products: Product[], invoices: Invoice[] }) {
  const totalSales = useMemo(() => invoices.reduce((sum, inv) => sum + inv.total, 0), [invoices]);
  const lowStockCount = useMemo(() => products.filter(p => p.stock <= p.minStock).length, [products]);
  const totalProducts = products.length;
  const recentSales = invoices.slice(0, 5);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return format(date, 'MMM dd');
    }).reverse();

    return last7Days.map(day => {
      const daySales = invoices
        .filter(inv => inv.createdAt && format(inv.createdAt.toDate(), 'MMM dd') === day)
        .reduce((sum, inv) => sum + inv.total, 0);
      return { name: day, sales: daySales };
    });
  }, [invoices]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Overview</h1>
        <p className="text-zinc-500">Welcome back. Here's what's happening today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value={`$${totalSales.toLocaleString()}`} icon={TrendingUp} trend="+12.5%" />
        <StatCard label="Total Products" value={totalProducts} icon={Package} />
        <StatCard label="Low Stock Items" value={lowStockCount} icon={AlertTriangle} />
        <StatCard label="Total Invoices" value={invoices.length} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 italic serif">Revenue Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="sales" stroke="#18181b" strokeWidth={3} dot={{ r: 4, fill: '#18181b' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 italic serif">Recent Sales</h3>
          <div className="space-y-4">
            {recentSales.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{inv.customerName}</p>
                  <p className="text-xs text-zinc-500">{inv.createdAt ? format(inv.createdAt.toDate(), 'MMM dd, HH:mm') : 'Just now'}</p>
                </div>
                <p className="text-sm font-bold text-zinc-900">${inv.total.toFixed(2)}</p>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-center text-zinc-500 py-10">No sales yet.</p>
            )}
          </div>
        </div >
      </div>
    </motion.div>
  );
}

function Inventory({ products }: { products: Product[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ name: '', sku: '', price: 0, stock: 0, minStock: 5, category: 'General', serialNumbers: [] as string[] });
  const [serialInput, setSerialInput] = useState('');
  const [adjustment, setAdjustment] = useState({ amount: 0, reason: 'Manual Adjustment', serials: '' });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const serials = serialInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
    if (serials.length !== formData.stock) {
      alert(`Please provide exactly ${formData.stock} serial numbers (one per line or comma separated). Currently provided: ${serials.length}`);
      return;
    }

    // Check if product with same SKU or Name already exists
    const existingProduct = products.find(p => 
      p.sku.toLowerCase() === formData.sku.toLowerCase() || 
      p.name.toLowerCase() === formData.name.toLowerCase()
    );

    try {
      if (existingProduct) {
        // Merge stock
        const productRef = doc(db, 'products', existingProduct.id);
        const batch = writeBatch(db);
        
        batch.update(productRef, {
          stock: increment(formData.stock),
          serialNumbers: [...existingProduct.serialNumbers, ...serials],
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'stockLogs'));
        batch.set(logRef, {
          productId: existingProduct.id,
          change: formData.stock,
          type: 'restock',
          timestamp: serverTimestamp(),
          note: `Merged restock (Match found for SKU: ${formData.sku} or Name: ${formData.name})`
        });

        await batch.commit();
        alert(`A product with the same SKU (${formData.sku}) or Name (${formData.name}) already exists. Stock has been merged into "${existingProduct.name}".`);
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), {
          ...formData,
          serialNumbers: serials,
          updatedAt: serverTimestamp()
        });
      }
      setIsAdding(false);
      setFormData({ name: '', sku: '', price: 0, stock: 0, minStock: 5, category: 'General', serialNumbers: [] });
      setSerialInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const serials = serialInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
    if (serials.length !== formData.stock) {
      alert(`Please provide exactly ${formData.stock} serial numbers. Currently provided: ${serials.length}`);
      return;
    }
    try {
      const productRef = doc(db, 'products', editingProduct.id);
      await updateDoc(productRef, {
        ...formData,
        serialNumbers: serials,
        updatedAt: serverTimestamp()
      });
      setEditingProduct(null);
      setFormData({ name: '', sku: '', price: 0, stock: 0, minStock: 5, category: 'General', serialNumbers: [] });
      setSerialInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteDoc(doc(db, 'products', deletingProduct.id));
      setDeletingProduct(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    
    const newSerials = adjustment.serials.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
    
    if (adjustment.amount > 0 && newSerials.length !== adjustment.amount) {
      alert(`Please provide exactly ${adjustment.amount} new serial numbers.`);
      return;
    }

    if (adjustment.amount < 0) {
      const removeCount = Math.abs(adjustment.amount);
      if (newSerials.length !== removeCount) {
        alert(`Please provide exactly ${removeCount} serial numbers to remove.`);
        return;
      }
      const invalid = newSerials.find(s => !(adjustingProduct.serialNumbers || []).includes(s));
      if (invalid) {
        alert(`Serial number "${invalid}" not found in current stock.`);
        return;
      }
    }

    try {
      const batch = writeBatch(db);
      const productRef = doc(db, 'products', adjustingProduct.id);
      
      let updatedSerials = [...(adjustingProduct.serialNumbers || [])];
      if (adjustment.amount > 0) {
        updatedSerials = [...updatedSerials, ...newSerials];
      } else {
        updatedSerials = updatedSerials.filter(s => !newSerials.includes(s));
      }

      batch.update(productRef, {
        stock: increment(adjustment.amount),
        serialNumbers: updatedSerials,
        updatedAt: serverTimestamp()
      });

      const logRef = doc(collection(db, 'stockLogs'));
      batch.set(logRef, {
        productId: adjustingProduct.id,
        change: adjustment.amount,
        type: adjustment.amount > 0 ? 'restock' : 'adjustment',
        timestamp: serverTimestamp(),
        note: `${adjustment.reason} (Serials: ${newSerials.join(', ')})`
      });

      await batch.commit();
      setAdjustingProduct(null);
      setAdjustment({ amount: 0, reason: 'Manual Adjustment', serials: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
      minStock: p.minStock,
      category: p.category,
      serialNumbers: p.serialNumbers || []
    });
    setSerialInput((p.serialNumbers || []).join('\n'));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Inventory</h1>
          <p className="text-zinc-500">Manage your stock levels and product details.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 transition-shadow shadow-md"
        >
          <Plus size={18} />
          Add Product
        </button>
      </header>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <Search size={20} className="text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search products by name or SKU..." 
          className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-900 placeholder:text-zinc-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Serial Numbers</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Price</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredProducts.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                  {p.sku}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {(p.serialNumbers || []).slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-mono">
                        {s}
                      </span>
                    ))}
                    {(p.serialNumbers || []).length > 3 && (
                      <span className="text-[10px] text-zinc-400 italic">+{(p.serialNumbers || []).length - 3} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500">{p.category}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900">${p.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900">{p.stock}</td>
                <td className="px-6 py-4">
                  {p.stock <= p.minStock ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                      <AlertTriangle size={12} />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      In Stock
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setAdjustingProduct(p)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                      title="Adjust Stock"
                    >
                      <ArrowUpDown size={18} />
                    </button>
                    <button 
                      onClick={() => setViewingHistory(p)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                      title="Stock History"
                    >
                      <History size={18} />
                    </button>
                    <button 
                      onClick={() => openEdit(p)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeletingProduct(p)}
                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingProduct) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <h2 className="text-2xl font-bold mb-6 italic serif">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h2>
              <form onSubmit={editingProduct ? handleUpdate : handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Product Name</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">SKU</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Category</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Price</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Stock</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Min Stock</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      value={formData.minStock}
                      onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Serial Numbers (One per line)</label>
                  <textarea 
                    required 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent font-mono text-sm"
                    rows={4}
                    placeholder="Enter serial numbers..."
                    value={serialInput}
                    onChange={e => setSerialInput(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Total serials: {serialInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '').length} / Required: {formData.stock}</p>
                </div>
                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsAdding(false);
                        setEditingProduct(null);
                        setFormData({ name: '', sku: '', price: 0, stock: 0, minStock: 5, category: 'General', serialNumbers: [] });
                        setSerialInput('');
                      }}
                      className="flex-1 py-2 rounded-lg border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg"
                    >
                      {editingProduct ? 'Update Product' : 'Save Product'}
                    </button>
                  </div>
                  {editingProduct && (
                    <button 
                      type="button"
                      onClick={() => {
                        setDeletingProduct(editingProduct);
                        setEditingProduct(null);
                      }}
                      className="w-full py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete Product
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {adjustingProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <h2 className="text-2xl font-bold mb-2 italic serif">Adjust Stock</h2>
              <p className="text-zinc-500 text-sm mb-6">Manually update stock for <span className="font-bold text-zinc-900">{adjustingProduct.name}</span></p>
              
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Current Stock</label>
                  <div className="px-4 py-2 bg-zinc-50 rounded-lg border border-zinc-100 font-bold text-zinc-900">
                    {adjustingProduct.stock}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Adjustment Amount (+/-)</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    placeholder="e.g. 10 or -5"
                    value={adjustment.amount}
                    onChange={e => setAdjustment({...adjustment, amount: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Reason</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    value={adjustment.reason}
                    onChange={e => setAdjustment({...adjustment, reason: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    {adjustment.amount > 0 ? 'New Serial Numbers' : 'Serial Numbers to Remove'} (One per line)
                  </label>
                  <textarea 
                    required 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent font-mono text-sm"
                    rows={3}
                    placeholder={adjustment.amount > 0 ? "Enter new serials..." : "Enter serials to remove..."}
                    value={adjustment.serials}
                    onChange={e => setAdjustment({...adjustment, serials: e.target.value})}
                  />
                  {adjustment.amount < 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Available Serials:</p>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-zinc-50 rounded border border-zinc-100">
                        {(adjustingProduct.serialNumbers || []).map(s => (
                          <span key={s} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-600">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setAdjustingProduct(null)}
                    className="flex-1 py-2 rounded-lg border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-zinc-200 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2 italic serif">Delete Product?</h2>
              <p className="text-zinc-500 text-sm mb-6">
                Are you sure you want to delete <span className="font-bold text-zinc-900">{deletingProduct.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingProduct(null)}
                  className="flex-1 py-2 rounded-lg border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock History Modal */}
      <AnimatePresence>
        {viewingHistory && (
          <StockHistoryModal 
            product={viewingHistory} 
            onClose={() => setViewingHistory(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StockHistoryModal({ product, onClose }: { product: Product, onClose: () => void }) {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'stockLogs'),
      orderBy('timestamp', 'desc')
    );
    
    // We filter client-side for simplicity in this demo, 
    // but in production you'd use a where() clause and an index.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLog));
      setLogs(allLogs.filter(log => log.productId === product.id));
      setLoading(false);
    });

    return unsubscribe;
  }, [product.id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-zinc-200 flex flex-col max-h-[80vh]"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold italic serif">Stock History</h2>
            <p className="text-zinc-500 text-sm">{product.name} ({product.sku})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <Trash2 size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-zinc-500 py-10">No history found for this product.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b border-zinc-100">
                <tr>
                  <th className="py-3 text-xs font-bold text-zinc-400 uppercase">Date</th>
                  <th className="py-3 text-xs font-bold text-zinc-400 uppercase">Type</th>
                  <th className="py-3 text-xs font-bold text-zinc-400 uppercase text-right">Change</th>
                  <th className="py-3 text-xs font-bold text-zinc-400 uppercase">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 text-sm text-zinc-500">
                      {log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        log.type === 'sale' ? 'bg-blue-50 text-blue-600' :
                        log.type === 'restock' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className={`py-3 text-sm font-bold text-right ${log.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </td>
                    <td className="py-3 text-sm text-zinc-600 pl-4">{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-100">
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Billing({ products, user }: { products: Product[], user: FirebaseUser }) {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [taxRate, setTaxRate] = useState(10);
  const [serialSearch, setSerialSearch] = useState('');
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const addBySerial = (serial: string) => {
    const cleanSerial = serial.trim();
    if (!cleanSerial) return;

    const product = products.find(p => (p.serialNumbers || []).includes(cleanSerial));
    if (product) {
      // Check if this specific serial is already in cart
      const isAlreadyInCart = cart.some(item => (item.serialNumbers || []).includes(cleanSerial));
      if (isAlreadyInCart) {
        alert(`Serial number ${cleanSerial} is already in the cart.`);
        setSerialSearch('');
        return;
      }

      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id);
        if (existing) {
          return prev.map(item => 
            item.productId === product.id 
              ? { 
                  ...item, 
                  quantity: item.quantity + 1, 
                  total: (item.quantity + 1) * item.price,
                  serialNumbers: [...item.serialNumbers, cleanSerial]
                }
              : item
          );
        }
        return [...prev, {
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          total: product.price,
          serialNumbers: [cleanSerial]
        }];
      });
      setSerialSearch('');
    } else {
      alert(`Serial number ${cleanSerial} not found in inventory.`);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (!customerName || cart.length === 0) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      
      // Create Invoice
      const invoiceRef = doc(collection(db, 'invoices'));
      const invoiceData = {
        customerName,
        items: cart,
        subtotal,
        tax,
        taxRate,
        total,
        createdAt: new Date(), // Temporary for immediate display
        createdBy: user.uid
      };

      batch.set(invoiceRef, {
        ...invoiceData,
        createdAt: serverTimestamp() // Use server timestamp for DB
      });

      // Update Stock & Create Logs
      cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const productRef = doc(db, 'products', item.productId);
        // Remove the sold serial numbers from the product's array
        const remainingSerials = (product.serialNumbers || []).filter(s => !(item.serialNumbers || []).includes(s));
        
        batch.update(productRef, {
          stock: increment(-item.quantity),
          serialNumbers: remainingSerials,
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'stockLogs'));
        batch.set(logRef, {
          productId: item.productId,
          change: -item.quantity,
          type: 'sale',
          timestamp: serverTimestamp(),
          note: `Sale to ${customerName} (Serials: ${item.serialNumbers.join(', ')})`
        });
      });

      await batch.commit();
      setLastInvoice({ id: invoiceRef.id, ...invoiceData } as Invoice);
      setCart([]);
      setCustomerName('');
    } catch (err) {
      console.error(err);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return item;
        
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > product.stock) return item;
        
        let newSerials = [...item.serialNumbers];
        if (delta > 0 && newQty > item.quantity) {
          // Add next available serial
          const nextSerial = product.serialNumbers[item.quantity];
          if (nextSerial) newSerials.push(nextSerial);
        } else if (delta < 0 && newQty < item.quantity) {
          // Remove last serial
          newSerials.pop();
        }

        return { ...item, quantity: newQty, total: newQty * item.price, serialNumbers: newSerials };
      }
      return item;
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">New Invoice</h1>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">ERP Billing Module v1.0</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-zinc-400 uppercase">Date</p>
          <p className="font-medium">{format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>
      </header>

      {/* Invoice Header Details */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <User size={12} /> Customer Name
          </label>
          <input 
            type="text" 
            required
            placeholder="Search or enter customer..."
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <TrendingUp size={12} /> Tax Rate (%)
          </label>
          <input 
            type="number" 
            required
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            value={taxRate}
            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <Search size={12} /> Identify Serial Number
          </label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Scan or enter Serial Number..." 
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all font-mono"
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addBySerial(serialSearch);
                }
              }}
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            
            <button 
              onClick={() => addBySerial(serialSearch)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Identify
            </button>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-200">
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider italic serif">Sr. No.</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider italic serif">Description</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider italic serif text-right">Unit Price</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider italic serif text-center">Quantity</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider italic serif text-right">Amount</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider italic serif text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {cart.map((item, index) => (
              <tr key={item.productId} className="group hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-xs font-mono text-zinc-400">{index + 1}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">SKU: {products.find(p => p.id === item.productId)?.sku}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.serialNumbers.map(s => (
                      <span key={s} className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-right font-medium text-zinc-600">
                  ${item.price.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded-md border border-zinc-200 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all text-zinc-400"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                    <div className="w-6 h-6" /> {/* Spacer instead of + button */}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-right font-bold text-zinc-900">
                  ${item.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-xs font-bold uppercase tracking-wider border border-transparent hover:border-red-100"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Box size={48} />
                    <p className="text-sm font-medium">No items added to invoice yet</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Summary */}
      <div className="flex flex-col md:flex-row justify-between gap-8">
        <div className="flex-1">
          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 border-dashed">
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4">Notes / Terms</h3>
            <textarea 
              placeholder="Add internal notes or terms..."
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-zinc-600 min-h-[100px] resize-none"
            />
          </div>
        </div>
        
        <div className="w-full md:w-96 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-medium text-zinc-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Tax ({taxRate}%)</span>
              <span className="font-medium text-zinc-900">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-4 border-t border-zinc-100">
              <span className="text-zinc-900 italic serif">Grand Total</span>
              <span className="text-zinc-900">${total.toFixed(2)}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0 || !customerName || isProcessing}
            onClick={handleCheckout}
            className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Receipt size={20} />
                Finalize & Print Invoice
              </>
            )}
          </button>
        </div>
      </div>

      {/* Last Invoice Modal for Printing */}
      <AnimatePresence>
        {lastInvoice && (
          <InvoiceModal 
            invoice={lastInvoice} 
            onClose={() => setLastInvoice(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InvoiceModal({ invoice, onClose }: { invoice: Invoice, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print-overlay">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        id="printable-invoice"
        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold italic serif">Invoice</h2>
            <p className="text-zinc-500 text-sm">#{invoice.id}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">StockMaster Pro</p>
            <p className="text-zinc-500 text-sm">ERP Billing System</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Bill To</p>
            <p className="font-bold text-lg">{invoice.customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Date</p>
            <p className="font-medium">
              {invoice.createdAt instanceof Date 
                ? format(invoice.createdAt, 'MMMM dd, yyyy')
                : invoice.createdAt?.toDate 
                  ? format(invoice.createdAt.toDate(), 'MMMM dd, yyyy')
                  : 'N/A'}
            </p>
          </div>
        </div>

        <table className="w-full mb-8">
          <thead className="border-b border-zinc-100">
            <tr>
              <th className="text-left py-2 text-xs font-bold text-zinc-400 uppercase">Description</th>
              <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Qty</th>
              <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Price</th>
              <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="py-3">
                  <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                  <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
                    S/N: {item.serialNumbers.join(', ')}
                  </p>
                </td>
                <td className="py-3 text-sm text-right">{item.quantity}</td>
                <td className="py-3 text-sm text-right">${item.price.toFixed(2)}</td>
                <td className="py-3 text-sm text-right font-bold">${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Tax ({invoice.taxRate ?? 10}%)</span>
              <span>${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-zinc-100">
              <span className="italic serif">Total</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 text-center">
          <p className="text-zinc-900 font-bold mb-1 italic serif">Thank you for your business!</p>
          <p className="text-zinc-400 text-xs uppercase tracking-widest">This is a computer generated invoice</p>
        </div>

        <div className="mt-12 flex gap-4 no-print">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Print to PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function HistoryView({ invoices }: { invoices: Invoice[] }) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
    inv.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Billing History</h1>
        <p className="text-zinc-500">View and manage past invoices.</p>
      </header>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <Search size={20} className="text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search by customer name or invoice ID..." 
          className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-900 placeholder:text-zinc-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Invoice ID</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif text-right">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider italic serif text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-zinc-400">#{inv.id.slice(-6).toUpperCase()}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900">{inv.customerName}</td>
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {inv.createdAt ? format(inv.createdAt.toDate(), 'MMM dd, yyyy') : 'Just now'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">${inv.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedInvoice(inv)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                  >
                    <FileText size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceModal 
            invoice={selectedInvoice} 
            onClose={() => setSelectedInvoice(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PurchaseOrdersView({ products, purchaseOrders, user }: { products: Product[], purchaseOrders: PurchaseOrder[], user: FirebaseUser }) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        serialNumbers: []
      }];
    });
  };

  const handleCreatePO = async () => {
    if (!supplierName || cart.length === 0) return;
    setIsProcessing(true);
    try {
      const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      await addDoc(collection(db, 'purchaseOrders'), {
        supplierName,
        items: cart,
        subtotal,
        tax,
        total,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setIsCreating(false);
      setCart([]);
      setSupplierName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPO = async (po: PurchaseOrder) => {
    if (!window.confirm('Are you sure you want to cancel this PO?')) return;
    try {
      const poRef = doc(db, 'purchaseOrders', po.id);
      await updateDoc(poRef, { status: 'cancelled' });
      alert('Purchase Order cancelled.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
    if (po.status !== 'pending') return;
    if (!window.confirm('Mark this PO as received? This will increase stock levels.')) return;

    try {
      const batch = writeBatch(db);
      
      po.items.forEach(item => {
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, {
          stock: increment(item.quantity),
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'stockLogs'));
        batch.set(logRef, {
          productId: item.productId,
          change: item.quantity,
          type: 'restock',
          timestamp: serverTimestamp(),
          note: `Received from PO #${po.id.slice(-6).toUpperCase()} (Supplier: ${po.supplierName})`
        });
      });

      const poRef = doc(db, 'purchaseOrders', po.id);
      batch.update(poRef, { status: 'received' });

      await batch.commit();
      alert('Stock updated successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Purchase Orders</h1>
          <p className="text-zinc-500">Manage stock procurement from suppliers.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Create PO
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">PO ID</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-zinc-400">#{po.id.slice(-6).toUpperCase()}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900">{po.supplierName}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    po.status === 'received' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    po.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {po.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">${po.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => setSelectedPO(po)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                      title="View Details"
                    >
                      <FileText size={18} />
                    </button>
                    {po.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleReceivePO(po)}
                          className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                          title="Mark as Received"
                        >
                          <Truck size={18} />
                        </button>
                        <button 
                          onClick={() => handleCancelPO(po)}
                          className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                          title="Cancel PO"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No purchase orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh]"
            >
              <h2 className="text-2xl font-bold mb-6 italic serif">New Purchase Order</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="flex flex-col min-h-0">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Supplier Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      placeholder="Enter supplier name..."
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Products</label>
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500">Stock: {p.stock}</p>
                          </div>
                          <button 
                            onClick={() => addToCart(p)}
                            className="p-2 text-zinc-400 hover:text-zinc-900"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-xl p-6 flex flex-col min-h-0">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart size={18} />
                    Order Items
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-white p-3 rounded-lg border border-zinc-200">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">${item.price.toFixed(2)} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.max(1, i.quantity - 1), total: Math.max(1, i.quantity - 1) * i.price } : i))}
                            className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-100"
                          >
                            -
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i))}
                            className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-100"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => setCart(prev => prev.filter(i => i.productId !== item.productId))}
                            className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors text-[10px] font-bold uppercase"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-zinc-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-medium">${cart.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="italic serif">Total (incl. tax)</span>
                      <span>${(cart.reduce((sum, i) => sum + i.total, 0) * 1.1).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreatePO}
                  disabled={isProcessing || cart.length === 0 || !supplierName}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Create Purchase Order'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPO && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-10 max-w-2xl w-full shadow-2xl border border-zinc-200 relative overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-bold italic serif mb-2">Purchase Order</h2>
                  <p className="text-zinc-400 font-mono text-sm">#{selectedPO.id.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    selectedPO.status === 'received' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {selectedPO.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Supplier</p>
                  <p className="text-zinc-900 font-bold">{selectedPO.supplierName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Date</p>
                  <p className="text-zinc-900 font-bold">{selectedPO.createdAt ? format(selectedPO.createdAt.toDate(), 'MMMM dd, yyyy') : 'N/A'}</p>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead className="border-b border-zinc-100">
                  <tr>
                    <th className="text-left py-2 text-xs font-bold text-zinc-400 uppercase">Description</th>
                    <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Qty</th>
                    <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Price</th>
                    <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {selectedPO.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm font-medium text-zinc-900">{item.name}</td>
                      <td className="py-3 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 text-sm text-right">${item.price.toFixed(2)}</td>
                      <td className="py-3 text-sm text-right font-bold">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Subtotal</span>
                    <span>${selectedPO.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-zinc-100">
                    <span className="italic serif">Total</span>
                    <span>${selectedPO.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setSelectedPO(null)} className="flex-1 py-3 rounded-xl border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors">Close</button>
                <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg flex items-center justify-center gap-2">
                  <Download size={18} />
                  Print PO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProformaView({ products, proformaInvoices, user }: { products: Product[], proformaInvoices: ProformaInvoice[], user: FirebaseUser }) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState<ProformaInvoice | null>(null);
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        serialNumbers: []
      }];
    });
  };

  const handleCreateProforma = async () => {
    if (!customerName || cart.length === 0) return;
    setIsProcessing(true);
    try {
      const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 15); // Valid for 15 days

      await addDoc(collection(db, 'proformaInvoices'), {
        customerName,
        items: cart,
        subtotal,
        tax,
        total,
        validUntil,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setIsCreating(false);
      setCart([]);
      setCustomerName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteProforma = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this proforma?')) return;
    try {
      await deleteDoc(doc(db, 'proformaInvoices', id));
    } catch (err) {
      console.error(err);
    }
  };

  const convertToInvoice = async (proforma: ProformaInvoice) => {
    if (!window.confirm('Convert this Proforma to a real Invoice? This will deduct stock.')) return;
    
    // Check if stock is available
    for (const item of proforma.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        alert(`Insufficient stock for ${item.name}. Available: ${product?.stock || 0}`);
        return;
      }
    }

    try {
      const batch = writeBatch(db);
      
      // Create Invoice
      const invoiceRef = doc(collection(db, 'invoices'));
      batch.set(invoiceRef, {
        customerName: proforma.customerName,
        items: proforma.items,
        subtotal: proforma.subtotal,
        tax: proforma.tax,
        total: proforma.total,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      // Update Stock
      proforma.items.forEach(item => {
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, {
          stock: increment(-item.quantity),
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'stockLogs'));
        batch.set(logRef, {
          productId: item.productId,
          change: -item.quantity,
          type: 'sale',
          timestamp: serverTimestamp(),
          note: `Converted from Proforma #${proforma.id.slice(-6).toUpperCase()}`
        });
      });

      // Delete Proforma (or mark as converted)
      const proformaRef = doc(db, 'proformaInvoices', proforma.id);
      batch.delete(proformaRef);

      await batch.commit();
      alert('Invoice created and stock updated!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Proforma Invoices</h1>
          <p className="text-zinc-500">Preliminary bills for customer quotes.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Create Proforma
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Valid Until</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {proformaInvoices.map((prof) => (
              <tr key={prof.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-zinc-400">#{prof.id.slice(-6).toUpperCase()}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900">{prof.customerName}</td>
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {prof.validUntil ? format(prof.validUntil.toDate(), 'MMM dd, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">${prof.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => setSelectedProforma(prof)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                      title="View Details"
                    >
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={() => convertToInvoice(prof)}
                      className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                      title="Convert to Invoice"
                    >
                      <TrendingUp size={18} />
                    </button>
                    <button 
                      onClick={() => deleteProforma(prof.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete Proforma"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {proformaInvoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No proforma invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Proforma Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh]"
            >
              <h2 className="text-2xl font-bold mb-6 italic serif">New Proforma Invoice</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="flex flex-col min-h-0">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Customer Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      placeholder="Enter customer name..."
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Products</label>
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500">Price: ${p.price}</p>
                          </div>
                          <button 
                            onClick={() => addToCart(p)}
                            className="p-2 text-zinc-400 hover:text-zinc-900"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-xl p-6 flex flex-col min-h-0">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart size={18} />
                    Quote Items
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-white p-3 rounded-lg border border-zinc-200">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">${item.price.toFixed(2)} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.max(1, i.quantity - 1), total: Math.max(1, i.quantity - 1) * i.price } : i))}
                            className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-100"
                          >
                            -
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i))}
                            className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-100"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => setCart(prev => prev.filter(i => i.productId !== item.productId))}
                            className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors text-[10px] font-bold uppercase"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-zinc-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-medium">${cart.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="italic serif">Total (incl. tax)</span>
                      <span>${(cart.reduce((sum, i) => sum + i.total, 0) * 1.1).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateProforma}
                  disabled={isProcessing || cart.length === 0 || !customerName}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Create Proforma'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProforma && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-10 max-w-2xl w-full shadow-2xl border border-zinc-200 relative overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-bold italic serif mb-2">Proforma Invoice</h2>
                  <p className="text-zinc-400 font-mono text-sm">#{selectedProforma.id.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Valid Until</p>
                  <p className="text-zinc-900 font-bold">{selectedProforma.validUntil ? format(selectedProforma.validUntil.toDate(), 'MMMM dd, yyyy') : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Customer</p>
                  <p className="text-zinc-900 font-bold">{selectedProforma.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Date Issued</p>
                  <p className="text-zinc-900 font-bold">{selectedProforma.createdAt ? format(selectedProforma.createdAt.toDate(), 'MMMM dd, yyyy') : 'N/A'}</p>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead className="border-b border-zinc-100">
                  <tr>
                    <th className="text-left py-2 text-xs font-bold text-zinc-400 uppercase">Description</th>
                    <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Qty</th>
                    <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Price</th>
                    <th className="text-right py-2 text-xs font-bold text-zinc-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {selectedProforma.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm font-medium text-zinc-900">{item.name}</td>
                      <td className="py-3 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 text-sm text-right">${item.price.toFixed(2)}</td>
                      <td className="py-3 text-sm text-right font-bold">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Subtotal</span>
                    <span>${selectedProforma.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-zinc-100">
                    <span className="italic serif">Total</span>
                    <span>${selectedProforma.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setSelectedProforma(null)} className="flex-1 py-3 rounded-xl border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors">Close</button>
                <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors shadow-lg flex items-center justify-center gap-2">
                  <Download size={18} />
                  Print Proforma
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
