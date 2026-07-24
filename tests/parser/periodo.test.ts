import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mesReferencia, parsePeriodo } from '../../src/parser/periodo.js';

describe('mesReferencia', () => {
  it('formata ano e mês no timezone configurado', () => {
    assert.equal(mesReferencia(new Date('2026-07-24T12:00:00Z')), '2026-07');
  });
});

describe('parsePeriodo', () => {
  it('interpreta mês explícito', () => {
    const periodo = parsePeriodo('2026-07');

    assert.equal(periodo.label, '2026-07');
    assert.equal(periodo.inicio.getFullYear(), 2026);
    assert.equal(periodo.inicio.getMonth(), 6);
    assert.equal(periodo.inicio.getDate(), 1);
  });

  it('interpreta dia explícito', () => {
    const periodo = parsePeriodo('2026-07-24');

    assert.equal(periodo.label, '24/07/2026');
    assert.equal(periodo.inicio.getFullYear(), 2026);
    assert.equal(periodo.inicio.getMonth(), 6);
    assert.equal(periodo.inicio.getDate(), 24);
  });
});
