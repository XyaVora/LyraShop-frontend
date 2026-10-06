import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildUrl, pageTitle, parseLocation } from './router.js';

describe('storefront routing', () => {
  it('parses the legal routes', () => {
    assert.deepEqual(parseLocation({ pathname: '/terms' }), { page: 'terms', params: {} });
    assert.deepEqual(parseLocation({ pathname: '/privacy' }), { page: 'privacy', params: {} });
  });

  it('builds legal and payment callback URLs', () => {
    assert.equal(buildUrl('terms'), '/terms');
    assert.equal(buildUrl('privacy'), '/privacy');
    assert.equal(
      buildUrl('payment-result', { vnp_ResponseCode: '00' }),
      '/payment/vnpay/return?vnp_ResponseCode=00',
    );
  });

  it('keeps malformed URL segments from crashing the application', () => {
    assert.deepEqual(parseLocation({ pathname: '/product/%' }), {
      page: 'detail',
      params: { product: '%' },
    });
  });

  it('provides descriptive titles for legal pages', () => {
    assert.equal(pageTitle('terms'), 'Điều khoản dịch vụ — LYRA');
    assert.equal(pageTitle('privacy'), 'Chính sách bảo mật — LYRA');
  });
});
