import test from 'basictap';
import calculateAllowedErrorCount from '../../../lib/utils/calculateAllowedErrorCount.js';

test('with 0 nodes', t => {
  const result = calculateAllowedErrorCount(3, 0);
  t.equal(result, 0);
});

test('with 1 nodes', t => {
  const result = calculateAllowedErrorCount(3, 1);
  t.equal(result, 0);
});

test('with 2 nodes', t => {
  const result = calculateAllowedErrorCount(3, 2);
  t.equal(result, 0);
});

test('with 3 nodes', t => {
  const result = calculateAllowedErrorCount(3, 3);
  t.equal(result, 0);
});

test('with 4 nodes', t => {
  const result = calculateAllowedErrorCount(3, 4);
  t.equal(result, 1);
});

test('with 5 nodes', t => {
  const result = calculateAllowedErrorCount(3, 5);
  t.equal(result, 2);
});

test('with 6 nodes', t => {
  const result = calculateAllowedErrorCount(3, 6);
  t.equal(result, 2);
});

test('with 7 nodes', t => {
  const result = calculateAllowedErrorCount(3, 7);
  t.equal(result, 2);
});

test('with 5 replicas 6 nodes', t => {
  const result = calculateAllowedErrorCount(5, 6);
  t.equal(result, 1);
});

test('with 5 replicas 10 nodes', t => {
  const result = calculateAllowedErrorCount(5, 10);
  t.equal(result, 4);
});

test('with 5 replicas 5 nodes', t => {
  const result = calculateAllowedErrorCount(5, 5);
  t.equal(result, 0);
});

test('with 5 replicas 2 nodes', t => {
  const result = calculateAllowedErrorCount(5, 2);
  t.equal(result, 0);
});
