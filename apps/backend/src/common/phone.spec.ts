import { normalizePkPhone } from './phone.js';

describe('normalizePkPhone', () => {
  it.each([
    ['03001234567', '+923001234567'],
    ['0300 1234567', '+923001234567'],
    ['0300-1234567', '+923001234567'],
    ['+923001234567', '+923001234567'],
    ['923001234567', '+923001234567'],
    ['00923001234567', '+923001234567'],
    ['3001234567', '+923001234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePkPhone(input)).toBe(expected);
  });

  it.each(['', 'abc', '12345', '02101234567', '+9230012345', '+1 202 555 0100'])(
    'rejects %s',
    (input) => {
      expect(normalizePkPhone(input)).toBeNull();
    },
  );
});