import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrities, studyOnlyCelebrities, studyCelebrities, newCelebrities, trueSentences, falseSentences } from '../src/objects.js';
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

test('144 imágenes distintas, 96 para estudio y 48 pares de frases originales', () => {
  assert.equal(celebrities.length, 48);
  assert.equal(studyOnlyCelebrities.length, 48);
  assert.equal(studyCelebrities.length, 96);
  assert.equal(newCelebrities.length, 48);
  const allPeople = [...studyCelebrities, ...newCelebrities];
  assert.equal(new Set(allPeople.map(person => person.id)).size, 144);
  assert.equal(new Set(allPeople.map(person => person.image)).size, 144);
  assert.equal(new Set(allPeople.map(person => person.name)).size, 144);
  assert.equal(trueSentences.length, 48);
  assert.equal(falseSentences.length, 48);
  assert.equal(new Set(celebrities.flatMap(person => [person.object, person.falseObject])).size, 96);
  celebrities.forEach((person, i) => {
    assert.ok(trueSentences[i].startsWith(person.name + ' tenía '));
    assert.ok(falseSentences[i].startsWith(person.name + ' tenía '));
    assert.notEqual(trueSentences[i], falseSentences[i]);
  });
});

test('1000 participantes: 96 en estudio, 24 V + 24 F originales y reconocimiento sin los 48 añadidos', () => {
  const originalOrder = celebrities.map(person => person.id);
  const studyOrder = studyCelebrities.map(person => person.id);
  const studyOnlyIds = new Set(studyOnlyCelebrities.map(person => person.id));
  const idsEverTrue = new Set();
  const idsEverFalse = new Set();
  for (let seed = 1; seed <= 1000; seed++) {
    const plan = createPlan(seededShuffle(seed));
    assert.equal(plan.exposure.length, 96);
    assert.deepEqual(new Set(plan.exposure.map(p => p.id)), new Set(studyOrder));
    assert.equal(new Set(plan.exposure.map(p => p.id)).size, 96);
    assert.equal(plan.verification.length, 48);
    assert.equal(new Set(plan.verification.map(p => p.id)).size, 48);
    assert.deepEqual(new Set(plan.verification.map(p => p.id)), new Set(originalOrder));
    assert.ok(plan.verification.every(p => !studyOnlyIds.has(p.id)));
    assert.equal(plan.verification.filter(p => p.isTrue).length, 24);
    assert.equal(plan.verification.filter(p => !p.isTrue).length, 24);
    assert.equal(new Set(plan.verification.map(p => p.statedObject)).size, 48);
    plan.verification.forEach(p => {
      (p.isTrue ? idsEverTrue : idsEverFalse).add(p.id);
      assert.equal(p.sentence, p.isTrue ? trueSentences[p.index] : falseSentences[p.index]);
      assert.equal(p.statedObject, p.isTrue ? p.object : p.falseObject);
    });
    assert.equal(plan.recognition.length, 96);
    assert.equal(plan.recognition.filter(p => p.isOld).length, 48);
    assert.equal(plan.recognition.filter(p => !p.isOld).length, 48);
    assert.equal(new Set(plan.recognition.map(p => p.id)).size, 96);
    assert.ok(plan.recognition.every(p => !studyOnlyIds.has(p.id)));
    assert.deepEqual(new Set(plan.recognition.filter(p => p.isOld).map(p => p.name)), new Set(celebrities.map(p => p.name)));
    assert.deepEqual(new Set(plan.recognition.filter(p => !p.isOld).map(p => p.name)), new Set(newCelebrities.map(p => p.name)));
  }
  assert.equal(idsEverTrue.size, 48);
  assert.equal(idsEverFalse.size, 48);
  assert.deepEqual(celebrities.map(p => p.id), originalOrder);
  assert.deepEqual(studyCelebrities.map(p => p.id), studyOrder);
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
  assert.equal(TIMING.recognitionFeedback, 300);
  assert.equal(TIMING.tetris, 900000);
});
