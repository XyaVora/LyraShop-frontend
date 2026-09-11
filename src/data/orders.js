export function normalizeOrder(raw, user = null) {
  const items = (raw?.items || []).map(item => ({
    id: item.id,
    key: String(item.id),
    variantId: item.variantId,
    name: item.productName || item.sku || 'Sản phẩm',
    sku: item.sku,
    size: item.size || 'Tiêu chuẩn',
    colorName: item.color || 'Mặc định',
    color: '#E4DAD0',
    icon: 'bi-bag',
    qty: item.quantity || 1,
    price: Number(item.unitPrice || 0),
    subtotal: Number(item.subtotal || 0),
  }));

  const total = Number(raw?.totalAmount || 0);
  const createdAt = raw?.createdAt ? new Date(raw.createdAt) : null;
  return {
    id: raw?.id,
    displayId: raw?.id ? `#${String(raw.id).slice(0, 8).toUpperCase()}` : '#LYRA',
    date: createdAt && !Number.isNaN(createdAt.valueOf())
      ? createdAt.toLocaleDateString('vi-VN')
      : '',
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null,
    status: String(raw?.status || 'PENDING').toLowerCase(),
    payment: raw?.paymentMethod || 'COD',
    paymentStatus: raw?.paymentStatus || 'UNPAID',
    paymentUrl: raw?.paymentUrl || null,
    total,
    subtotal: total,
    shipping: 0,
    discount: 0,
    items,
    note: raw?.note || '',
    address: {
      name: user?.name || user?.fullName || 'Khách hàng',
      phone: raw?.shippingPhone || user?.phone || '—',
      address: raw?.shippingAddress || '—',
    },
  };
}
