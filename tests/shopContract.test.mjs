import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAddCartItemRequest,
  buildCreateOrderRequest,
  formatShippingAddress,
  isUuid,
  mapCartToItems,
  mapOrderResponse,
  mapProductDetail,
  resolveVariantId,
  toApiPaymentMethod,
  toUiStatus,
} from '../src/services/shopContract.mjs';

test('buildAddCartItemRequest only sends variantId and quantity 1–99', () => {
  assert.deepEqual(buildAddCartItemRequest('11111111-1111-4111-8111-111111111111', 2), {
    variantId: '11111111-1111-4111-8111-111111111111',
    quantity: 2,
  });
  assert.equal(buildAddCartItemRequest('11111111-1111-4111-8111-111111111111', 0).quantity, 1);
  assert.equal(buildAddCartItemRequest('11111111-1111-4111-8111-111111111111', 200).quantity, 99);
  assert.deepEqual(Object.keys(buildAddCartItemRequest('11111111-1111-4111-8111-111111111111', 1)).sort(), [
    'quantity',
    'variantId',
  ]);
});

test('buildCreateOrderRequest matches CreateOrderRequest and only COD|VNPAY', () => {
  const body = buildCreateOrderRequest({
    shippingAddress: ' 12 Hai Ba Trung, Hoan Kiem, Ha Noi ',
    shippingPhone: ' 0912345678 ',
    note: ' goi truoc ',
    paymentMethod: 'vnpay',
    extra: 'drop-me',
  });
  assert.deepEqual(body, {
    shippingAddress: '12 Hai Ba Trung, Hoan Kiem, Ha Noi',
    shippingPhone: '0912345678',
    paymentMethod: 'VNPAY',
    note: 'goi truoc',
  });
  assert.equal(toApiPaymentMethod('momo'), 'COD');
  assert.equal(toApiPaymentMethod('cod'), 'COD');
  const noNote = buildCreateOrderRequest({
    shippingAddress: 'A',
    shippingPhone: '0',
    note: '   ',
    paymentMethod: 'cod',
  });
  assert.equal(Object.hasOwn(noNote, 'note'), false);
});

test('mapCartToItems uses CartItemResponse fields (no productName)', () => {
  const items = mapCartToItems({
    id: 'cart-1',
    totalAmount: 200000,
    items: [{
      id: 9,
      variantId: '22222222-2222-4222-8222-222222222222',
      sku: 'AO-L-DEN',
      size: 'L',
      color: 'Den',
      unitPrice: 100000,
      quantity: 2,
      subtotal: 200000,
    }],
  }, {
    '22222222-2222-4222-8222-222222222222': { name: 'Ao lua', image: 'https://img' },
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].cartItemId, 9);
  assert.equal(items[0].key, '9');
  assert.equal(items[0].name, 'Ao lua');
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].price, 100000);
  assert.equal(items[0].variantColor, 'Den');
});

test('mapOrderResponse maps backend status and items with productName', () => {
  const order = mapOrderResponse({
    id: '33333333-3333-4333-8333-333333333333',
    totalAmount: 150000,
    status: 'PENDING',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    shippingAddress: '12 Pho Hue',
    shippingPhone: '0900000000',
    note: null,
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
    items: [{
      id: 1,
      variantId: '22222222-2222-4222-8222-222222222222',
      productName: 'Ao lua',
      sku: 'AO-L-DEN',
      size: 'L',
      color: 'Den',
      quantity: 1,
      unitPrice: 150000,
      subtotal: 150000,
    }],
  });
  assert.equal(order.status, 'processing');
  assert.equal(order.payment, 'cod');
  assert.equal(order.total, 150000);
  assert.equal(order.shipping, 0);
  assert.equal(order.items[0].name, 'Ao lua');
  assert.equal(order.source, 'api');
  assert.equal(toUiStatus('SHIPPING'), 'shipping');
  assert.equal(toUiStatus('CANCELLED'), 'cancelled');
});

test('resolveVariantId matches size/color then falls back to first variant', () => {
  const product = mapProductDetail({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Ao',
    slug: 'ao',
    description: 'desc',
    basePrice: 100000,
    categoryId: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    averageRating: 4.5,
    reviewCount: 3,
    variants: [
      { id: '55555555-5555-4555-8555-555555555555', sku: 'S-KEM', size: 'S', color: 'Kem sua', price: 90000, stock: 2 },
      { id: '66666666-6666-4666-8666-666666666666', sku: 'M-DEN', size: 'M', color: 'Den muc', price: 100000, stock: 5 },
    ],
    images: [{ url: 'https://cdn.example/a.jpg', primary: true, sortOrder: 0 }],
  });
  assert.equal(resolveVariantId(product, 'M', 'Den muc'), '66666666-6666-4666-8666-666666666666');
  assert.equal(resolveVariantId(product), '55555555-5555-4555-8555-555555555555');
  assert.equal(product.price, 90000);
  assert.equal(product.stock, 7);
  assert.equal(isUuid(product.id), true);
});

test('formatShippingAddress joins street, district, city', () => {
  assert.equal(
    formatShippingAddress({ street: '12 Pho Hue', district: 'Hoan Kiem', city: 'Ha Noi' }),
    '12 Pho Hue, Hoan Kiem, Ha Noi',
  );
});
