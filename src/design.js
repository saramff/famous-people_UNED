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

// Las teclas de verificación siguen la posición de las etiquetas en la pantalla.
export function scoreVerificationResponse(item, key) {
  const correctResponse = item.isTrue ? 'l' : 'a';
  const responseMeaning = key === 'l' ? 'SÍ' : 'NO';
  const correct = key === correctResponse;
  return {
    correct_response: correctResponse,
    response_meaning: responseMeaning,
    correct,
    accuracy: correct ? 'Correcta' : 'Incorrecta',
  };
}

// En reconocimiento, 1–3 indican Visto y 4–6 Nuevo, con certeza máxima en los extremos.
export function scoreRecognitionResponse(item, rating) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 6) {
    throw new RangeError('La respuesta de reconocimiento debe ser un entero del 1 al 6.');
  }
  const responseIsSeen = rating <= 3;
  const correct = responseIsSeen === item.isOld;
  return {
    correct_response: item.isOld ? [1, 2, 3] : [4, 5, 6],
    response_meaning: responseIsSeen ? 'Visto' : 'Nuevo',
    response_is_seen: responseIsSeen,
    correct,
    accuracy: correct ? 'Correcta' : 'Incorrecta',
  };
}
