// Controlled simulation: no product is created on Shopify.
import test from 'node:test';
import assert from 'node:assert/strict';
import {assessShipping, freightTag, weightForShopify} from './shipping-policy.mjs';

test('new small item goes to standard transport', () => {
  const item = {title:'Example USB cable',weight:0.15};
  assert.equal(assessShipping(item).status,'SAFE');
  assert.equal(assessShipping(item).freight,false);
});
test('new heavy item is tagged Sperrgut', () => {
  const item = {title:'Example large appliance',shippingWeightKg:34.5,weight:33};
  assert.equal(assessShipping(item).status,'SAFE');
  assert.equal(assessShipping(item).freight,true);
  assert.equal(weightForShopify(item),34.5);
  assert.equal(freightTag,'IUMATEC-SPERRGUT');
});
test('new TV with unknown shipping weight stays under review', () => {
  const item = {title:'Example 85" OLED TV',weight:0};
  assert.equal(assessShipping(item).status,'REVIEW');
  assert.throws(()=>weightForShopify(item),/Shipping safety gate/);
});
test('bulky packaging triggers freight even below 30 kg', () => {
  const item = {title:'Example bulky package',shippingWeightKg:22,packageLengthCm:120,packageWidthCm:80,packageHeightCm:65};
  assert.equal(assessShipping(item).freight,true);
});
