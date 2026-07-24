import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCorrecao } from '../../src/parser/correcao.js';

describe('parseCorrecao', () => {
  it('interpreta correção completa', () => {
    assert.deepEqual(parseCorrecao('corrigir 42 valor 60 descricao almoço forma pix'), {
      cnLancamento: 42,
      patch: {
        valor: 60,
        descricao: 'almoço',
        formaPagamento: 'pix',
      },
    });
  });

  it('limpa categoria quando usuário informa nenhuma', () => {
    assert.deepEqual(parseCorrecao('corrigir 42 categoria nenhuma'), {
      cnLancamento: 42,
      patch: {
        categoria: null,
      },
    });
  });

  it('rejeita comando sem patch válido', () => {
    assert.equal(parseCorrecao('corrigir 42'), null);
  });
});
