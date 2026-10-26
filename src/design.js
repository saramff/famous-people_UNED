import { celebrities, newCelebrities, trueSentences, falseSentences } from './objects.js';

// Recibe la función shuffle de jsPsych. No modifica nunca el catálogo original.
export function createPlan(shuffle) {
  const exposure = shuffle(celebrities);
  let reexposure = shuffle(celebrities);
  // Evita incluso el caso muy improbable de obtener el mismo orden completo.
  if (exposure.every((person, i) => person.id === reexposure[i].id)) {
    reexposure = [...reexposure.slice(1), reexposure[0]];
  }

  const trueIds = new Set(shuffle(celebrities).slice(0, 24).map(person => person.id));
  const verification = shuffle(celebrities.map(person => {
    const isTrue = trueIds.has(person.id);
    return {
      ...person,
      isTrue,
      sentence: isTrue ? trueSentences[person.index] : falseSentences[person.index],
      statedObject: isTrue ? person.object : person.falseObject,
    };
  }));

  const recognition = shuffle([
    ...celebrities.map(person => ({ ...person, isOld: true })),
    ...newCelebrities.map(person => ({ ...person, isOld: false })),
  ]);
  return { exposure, reexposure, verification, recognition };
}

// Las teclas son fijas y siguen la posición de las etiquetas en la pantalla.
export function scoreResponse(phase, item, key) {
  const correctResponse = phase === 3
    ? (item.isTrue ? 'l' : 'a')
    : (item.isOld ? 'a' : 'l');
  const responseMeaning = phase === 3
    ? (key === 'l' ? 'SÍ' : 'NO')
    : (key === 'a' ? 'Antiguo' : 'Nuevo');
  const correct = key === correctResponse;
  return {
    correct_response: correctResponse,
    response_meaning: responseMeaning,
    correct,
    accuracy: correct ? 'Correcta' : 'Incorrecta',
  };
}
