import React, { useState } from 'react';
import { ShoppingCart, Plus, Eye, Trash2, Download } from 'lucide-react';
import { Order, OrderItem, CropType, Customer } from '../types';

interface OrderManagerProps {
  orders: Order[];
  crops: CropType[];
  customers: Customer[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onGenerateInvoice: (order: Order) => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  crops,
  customers,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onGenerateInvoice,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<Partial<Order>>({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending',
    items: [],
    totalAmount: 0,
    notes: '',
  });
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    cropId: '',
    quantity: 1,
    unitPrice: 0,
  });

  const getCropName = (cropId: string) => crops.find((c) => c.id === cropId)?.name || 'Unknown';
  const getCustomerName = (customerId: string) =>
    customers.find((c) => c.id === customerId)?.name || 'Unknown';

  const handleAddItem = () => {
    if (!newItem.cropId || !newItem.quantity || !newItem.unitPrice) {
      alert('Please fill in all item details');
      return;
    }

    const subtotal = (newItem.quantity || 0) * (newItem.unitPrice || 0);
    const item: OrderItem = {
      id: Date.now().toString(),
      cropId: newItem.cropId,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      subtotal,
    };

    const items = [...(formData.items || []), item];
    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);

    setFormData({ ...formData, items, totalAmount });
    setNewItem({ cropId: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (itemId: string) => {
    const items = (formData.items || []).filter((i) => i.id !== itemId);
    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);
    setFormData({ ...formData, items, totalAmount });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.items || formData.items.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    if (selectedOrder) {
      onUpdateOrder({
        ...selectedOrder,
        ...formData,
      } as Order);
      setSelectedOrder(null);
    } else {
      const newOrder: Order = {
        id: Date.now().toString(),
        customerId: formData.customerId!,
        date: formData.date!,
        dueDate: formData.dueDate!,
        status: formData.status as 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled',
        items: formData.items!,
        totalAmount: formData.totalAmount!,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      };
      onAddOrder(newOrder);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      items: [],
      totalAmount: 0,
      notes: '',
    });
    setNewItem({ cropId: '', quantity: 1, unitPrice: 0 });
  };

  const handleEditOrder = (order: Order) => {
    setFormData(order);
    setSelectedOrder(order);
    setShowForm(true);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Customer Orders</h2>
        </div>
        <button
          onClick={() => {
            resetForm();
            setSelectedOrder(null);
            setShowForm(!showForm);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Order</span>
        </button>
      </div>

      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowForm(false)}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4 w-full max-w-2xl shadow-xl">
          <h3 className="font-semibold text-slate-900">
            {selectedOrder ? 'Edit Order' : 'Create New Order'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Customer *
                </label>
                <select
                  value={formData.customerId || ''}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Status</label>
                <select
                  value={formData.status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions or notes"
                  className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-mint"
                />
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-[rgba(255,255,255,0.12)] pt-4">
              <h4 className="font-semibold text-white mb-3">Order Items</h4>
              <div className="space-y-3 mb-4">
                {(formData.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-[rgba(255,255,255,0.06)] p-3 rounded-lg border border-[rgba(255,255,255,0.12)]">
                    <div>
                      <p className="font-medium text-white">{getCropName(item.cropId)}</p>
                      <p className="text-sm text-[var(--text-subtle)]">
                        {item.quantity} tray{item.quantity !== 1 ? 's' : ''} @ €{item.unitPrice} = €{item.subtotal.toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id!)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3 bg-[rgba(255,255,255,0.06)] p-4 rounded-lg border border-[rgba(255,255,255,0.12)]">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Crop</label>
                    <select
                      value={newItem.cropId || ''}
                      onChange={(e) => setNewItem({ ...newItem, cropId: e.target.value })}
                      className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint text-sm"
                    >
                      <option value="">Select</option>
                      {crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Qty</label>
                    <input
                      type="number"
                      value={newItem.quantity || 1}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: parseInt(e.target.value) })
                      }
                      min="1"
                      className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Price €</label>
                    <input
                      type="number"
                      value={newItem.unitPrice || 0}
                      onChange={(e) =>
                        setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) })
                      }
                      step="0.01"
                      className="w-full px-3 py-2 border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mint text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full bg-mint text-slate-900 px-3 py-2 rounded-lg hover:bg-mint/80 transition-colors text-sm font-medium"
                >
                  + Add Item
                </button>
              </div>

              {(formData.items || []).length > 0 && (
                <div className="mt-3 text-right text-lg font-bold text-mint">
                  Total: €{(formData.totalAmount || 0).toFixed(2)}
                </div>
              )}
            </div>

            <div className="flex space-x-3 border-t border-[rgba(255,255,255,0.12)] pt-4">
              <button
                type="submit"
                className="flex-1 bg-mint text-slate-900 px-4 py-2 rounded-lg hover:bg-mint/80 transition-colors font-semibold"
              >
                {selectedOrder ? 'Update' : 'Create'} Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 bg-[rgba(255,255,255,0.12)] text-white px-4 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.18)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
            </div>
          </div>
        </>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-8 bg-[rgba(255,255,255,0.06)] rounded-lg text-[var(--text-subtle)] border border-[rgba(255,255,255,0.12)]">
            <ShoppingCart className="w-12 h-12 text-[var(--text-subtle)] mx-auto mb-2" />
            <p>No orders yet</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <p className="font-semibold text-white">{getCustomerName(order.customerId)}</p>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        statusColors[order.status]
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-subtle)]">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} • €{order.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    Due: {new Date(order.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onGenerateInvoice(order)}
                    className="text-green-600 hover:text-green-700 transition-colors p-2"
                    title="Generate Invoice"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEditOrder(order)}
                    className="text-blue-600 hover:text-blue-700 transition-colors p-2"
                    title="Edit Order"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteOrder(order.id)}
                    className="text-red-600 hover:text-red-700 transition-colors p-2"
                    title="Delete Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {order.items.length > 0 && (
                <div className="text-sm text-[var(--text-subtle)] space-y-1">
                  {order.items.slice(0, 2).map((item) => (
                    <p key={item.id}>
                      {getCropName(item.cropId)} × {item.quantity}
                    </p>
                  ))}
                  {order.items.length > 2 && (
                    <p className="italic">+ {order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderManager;
