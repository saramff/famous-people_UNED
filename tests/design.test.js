import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrities, newCelebrities, trueSentences, falseSentences } from '../src/objects.js';
import { createPlan, scoreVerificationResponse, scoreRecognitionResponse } from '../src/design.js';
import { TIMING } from '../src/config.js';

// Generador reproducible solo para pruebas. El experimento usa el de jsPsych.
function seededShuffle(seed) {
  return items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = Math.floor((seed / 2 ** 32) * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
}

test('96 imágenes distintas y 48 pares de frases sin repetir objetos', () => {
  assert.equal(celebrities.length, 48);
  assert.equal(newCelebrities.length, 48);
  assert.equal(new Set([...celebrities, ...newCelebrities].map(person => person.image)).size, 96);
  assert.equal(new Set([...celebrities, ...newCelebrities].map(person => person.name)).size, 96);
  assert.equal(trueSentences.length, 48);
  assert.equal(falseSentences.length, 48);
  assert.equal(new Set(celebrities.flatMap(person => [person.object, person.falseObject])).size, 96);
  celebrities.forEach((person, i) => {
    assert.ok(trueSentences[i].startsWith(person.name + ' tenía '));
    assert.ok(falseSentences[i].startsWith(person.name + ' tenía '));
    assert.notEqual(trueSentences[i], falseSentences[i]);
  });
});

test('1000 participantes: 24 V + 24 F excluyentes y 48 vistos + 48 nuevos', () => {
  const originalOrder = celebrities.map(person => person.id);
  const idsEverTrue = new Set();
  const idsEverFalse = new Set();
  for (let seed = 1; seed <= 1000; seed++) {
    const plan = createPlan(seededShuffle(seed));
    assert.equal(plan.exposure.length, 48);
    assert.deepEqual(new Set(plan.exposure.map(p => p.id)), new Set(originalOrder));
    assert.deepEqual(new Set(plan.reexposure.map(p => p.id)), new Set(originalOrder));
    assert.notDeepEqual(plan.exposure.map(p => p.id), plan.reexposure.map(p => p.id));
    assert.equal(plan.verification.length, 48);
    assert.equal(new Set(plan.verification.map(p => p.id)).size, 48);
    assert.equal(plan.verification.filter(p => p.isTrue).length, 24);
    assert.equal(plan.verification.filter(p => !p.isTrue).length, 24);
    assert.equal(new Set(plan.verification.map(p => p.statedObject)).size, 48);
    plan.verification.forEach(p => (p.isTrue ? idsEverTrue : idsEverFalse).add(p.id));
    assert.equal(plan.recognition.length, 96);
    assert.equal(plan.recognition.filter(p => p.isOld).length, 48);
    assert.equal(plan.recognition.filter(p => !p.isOld).length, 48);
    assert.equal(new Set(plan.recognition.map(p => p.id)).size, 96);
    assert.deepEqual(new Set(plan.recognition.filter(p => p.isOld).map(p => p.name)), new Set(plan.exposure.map(p => p.name)));
    assert.deepEqual(new Set(plan.recognition.filter(p => !p.isOld).map(p => p.name)), new Set(newCelebrities.map(p => p.name)));
  }
  assert.equal(idsEverTrue.size, 48);
  assert.equal(idsEverFalse.size, 48);
  assert.deepEqual(celebrities.map(p => p.id), originalOrder);
});

test('si el sorteo repite el orden completo, la segunda fase tiene otro orden', () => {
  const plan = createPlan(items => [...items]);
  assert.notDeepEqual(plan.exposure.map(p => p.id), plan.reexposure.map(p => p.id));
});

test('la verificación respeta A = NO y L = SÍ', () => {
  for (const condition of [true, false]) {
    for (const key of ['a', 'l']) {
      const result = scoreVerificationResponse({ isTrue: condition }, key);
      const expectedKey = condition ? 'l' : 'a';
      assert.equal(result.correct_response, expectedKey);
      assert.equal(result.correct, key === expectedKey);
      assert.equal(result.accuracy, key === expectedKey ? 'Correcta' : 'Incorrecta');
      assert.equal(result.response_meaning, key === 'l' ? 'SÍ' : 'NO');
    }
  }
});

test('reconocimiento: los seis valores puntúan Visto/Nuevo con independencia de la frase anterior', () => {
  for (const isOld of [true, false]) {
    for (const isTrue of [true, false]) {
      for (const rating of [1, 2, 3, 4, 5, 6]) {
        const result = scoreRecognitionResponse({ isOld, isTrue }, rating);
        const isSeen = rating <= 3;
        assert.equal(result.response_meaning, isSeen ? 'Visto' : 'Nuevo');
        assert.equal(result.response_is_seen, isSeen);
        assert.deepEqual(result.correct_response, isOld ? [1, 2, 3] : [4, 5, 6]);
        assert.equal(result.correct, isSeen === isOld);
        assert.equal(result.accuracy, isSeen === isOld ? 'Correcta' : 'Incorrecta');
      }
    }
  }
});

test('reconocimiento rechaza respuestas vacías, teclas y valores fuera de la escala', () => {
  for (const rating of [undefined, null, 'a', 'l', '1', 0, 7, 3.5, NaN]) {
    assert.throws(() => scoreRecognitionResponse({ isOld: true }, rating), RangeError);
  }
});

test('tiempos del protocolo', () => {
  assert.equal(TIMING.fixation, 500);
  assert.equal(TIMING.recognitionFixation, 2000);
  assert.equal(TIMING.exposure, 5000);
  assert.equal(TIMING.exposureGap, 1000);
  assert.equal(TIMING.tetris, 420000);
});
