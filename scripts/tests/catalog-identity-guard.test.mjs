import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogIdentity, isQuarantinedShopifyProduct } from '../catalog-identity-guard.mjs';
const source = { merchandiseId: 'gid://shopify/ProductVariant/123', sku: 'ABC 123', ean: '7612345678901' };
const shop = { variantId: 'gid://shopify/ProductVariant/123', sku: 'ABC 123', barcode: '7612345678901', productId: 'gid://shopify/Product/999' };
test('matching variant, SKU and EAN is accepted', () => assert.equal(validateCatalogIdentity(source, shop).ok, true));
test('matching variant but mismatched SKU is rejected', () => assert.match(validateCatalogIdentity(source, {...shop, sku:'COFFEE'}).reason,/sku/));
test('matching SKU but wrong EAN is rejected', () => assert.match(validateCatalogIdentity(source,{...shop, barcode:'8000070038271'}).reason,/ean/));
test('matching EAN but wrong variant is rejected', () => assert.match(validateCatalogIdentity(source,{...shop,variantId:'gid://shopify/ProductVariant/124'}).reason,/variant/));
test('missing SKU or barcode blocks a linked product', () => {
 assert.equal(validateCatalogIdentity(source, {...shop,sku:''}).ok,false);
 assert.equal(validateCatalogIdentity(source, {...shop,barcode:''}).ok,false);
});
test('unverified variant ID alone is insufficient', () => assert.equal(validateCatalogIdentity({merchandiseId:source.merchandiseId},shop).ok,false));
test('unique SKU without EAN or variant can match', () => assert.equal(validateCatalogIdentity({sku:'ABC 123'},{sku:'ABC 123',variantId:shop.variantId}).ok,true));
test('quarantine blocks products independently of SKU/EAN', () => {
 assert.equal(isQuarantinedShopifyProduct('gid://shopify/Product/15839405080960'),true);
 assert.equal(validateCatalogIdentity(source,{...shop,productId:'gid://shopify/Product/15839405080960'}).ok,false);
});
test('missing records are never approved', () => assert.equal(validateCatalogIdentity(null,shop).ok,false));
