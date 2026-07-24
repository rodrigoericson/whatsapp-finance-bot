import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGastoCommand, parseGastoNatural, parseValor } from '../../src/parser/gasto.js';

describe('parseValor', () => {
  it('converte valores em formato brasileiro', () => {
    assert.equal(parseValor('R$ 1.234,56'), 1234.56);
  });

  it('rejeita valores zerados ou inválidos', () => {
    assert.equal(parseValor('0'), null);
    assert.equal(parseValor('abc'), null);
  });
});

describe('parseGastoCommand', () => {
  it('interpreta gasto simples com forma de pagamento', () => {
    assert.deepEqual(parseGastoCommand('gasto 50 almoço pix'), {
      valor: 50,
      descricao: 'almoço',
      categoria: null,
      formaPagamento: 'pix',
      qtParcelas: null,
      pessoaGastoNome: null,
    });
  });

  it('interpreta pessoa antes do valor e categoria explícita', () => {
    assert.deepEqual(parseGastoCommand('gasto marcelo 600 planta baixa pix categoria infra'), {
      valor: 600,
      descricao: 'planta baixa',
      categoria: 'infra',
      formaPagamento: 'pix',
      qtParcelas: null,
      pessoaGastoNome: 'Marcelo',
    });
  });

  it('interpreta parcelamento e assume cartão quando forma não aparece', () => {
    assert.deepEqual(parseGastoCommand('gasto mercado 1000 em 3x'), {
      valor: 1000,
      descricao: 'sem descrição',
      categoria: null,
      formaPagamento: 'cartao',
      qtParcelas: 3,
      pessoaGastoNome: 'Mercado',
    });
  });
});

describe('parseGastoNatural', () => {
  it('interpreta frase natural simples', () => {
    assert.deepEqual(parseGastoNatural('gastei 25 no almoço pix'), {
      valor: 25,
      descricao: 'almoço',
      categoria: null,
      formaPagamento: 'pix',
      qtParcelas: null,
      pessoaGastoNome: null,
    });
  });

  it('ignora texto sem gatilho natural', () => {
    assert.equal(parseGastoNatural('almoço 25 pix'), null);
  });
});
