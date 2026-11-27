import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessShipping, freightTag, weightForShopify} from './shipping-policy.mjs';

test('light article remains standard', () => {
  const a=assessShipping({title:'Computermaus',weight:0.35});
  assert.equal(a.status,'SAFE'); assert.equal(a.freight,false);
});
test('30kg+ auto selects freight', () => {
  const a=assessShipping({title:'Waschmaschine',weight:34});
  assert.equal(a.status,'SAFE');assert.equal(a.freight,true);
});
test('potentially large TV with only low net weight is held for review', () => {
  const a=assessShipping({title:'Panasonic OLED TV 65"',weight:18});
  assert.equal(a.status,'REVIEW');
});
test('large TV with verified packaged weight selects freight', () => {
  const a=assessShipping({title:'Panasonic OLED TV 65"',weight:18,packagedWeightKg:39});
  assert.equal(a.status,'SAFE');assert.equal(a.freight,true);
  assert.equal(weightForShopify({title:'Panasonic OLED TV 65"',weight:18,packagedWeightKg:39}),39);
});
test('oversize package >0.55 cubic metres selects freight', () => {
  const a=assessShipping({title:'Package',weight:20,packageLengthCm:150,packageWidthCm:80,packageHeightCm:50});
  assert.equal(a.status,'SAFE');assert.equal(a.freight,true);
});
test('unknown weight is not allowed into new imports', () => {
  assert.equal(assessShipping({title:'Maus',weight:0}).status,'REVIEW');
});
test('contradictory weights get reviewed', () => {
  assert.equal(assessShipping({title:'TV',weight:60,packagedWeightKg:20}).status,'REVIEW');
});
test('tag matches Shopify market collection', () => {
  assert.equal(freightTag,'IUMATEC-SPERRGUT');
});

test('oversize with low packaged weight but missing volume is held', () => {
  const a=assessShipping({title:'TV 75\" UHD',packagedWeightKg:24});
  assert.equal(a.status,'REVIEW');
});
