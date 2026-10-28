import { initJsPsych } from 'jspsych';
import htmlKeyboard from '@jspsych/plugin-html-keyboard-response';
import surveyHtmlForm from '@jspsych/plugin-survey-html-form';
import preload from '@jspsych/plugin-preload';
import fullscreen from '@jspsych/plugin-fullscreen';
import 'jspsych/css/jspsych.css';
import './style.css';
import consentHtml from '../consentA2.html?raw';
import demographicsHtml from './datos.html?raw';
import { celebrities, IMAGE_REVISION } from './objects.js';
import { createPlan, scoreVerificationResponse, scoreRecognitionResponse } from './design.js';
import { TIMING, EXPERIMENT_VERSION, CONSENT_VERSION } from './config.js';
import { startTetris, tetrisHtml } from './tetris.js';
import { saveSession } from './storage.js';

// Retirar la copia que pudiera quedar de versiones anteriores. No se crean copias nuevas.
try { localStorage.removeItem('uned-famosos-pending-session'); } catch { /* Puede estar bloqueado. */ }

const root = document.querySelector('#experiment');
root.replaceChildren();
const brand = `<header class="brand-row"><img src="./logos/uned.png" class="uned-logo" alt="UNED"><img src="./logos/psicologia-uned.gif" class="faculty-logo" alt="Facultad de Psicología de la UNED"></header>`;
let game;
let trialStartedAt = 0;
const participantId = crypto.randomUUID();
const participant = { participant_id: participantId };
const startedAt = new Date().toISOString();

// jsPsych añade automáticamente rt, trial_index y time_elapsed.
const jsPsych = initJsPsych({
  display_element: root,
  on_trial_start: trial => {
    root.scrollTop = 0;
    root.dataset.screen = trial.css_classes?.includes('experimental-screen') ? 'stimulus' : 'other';
    trialStartedAt = performance.now();
  },
  on_data_update: data => {
    data.recorded_at = new Date().toISOString();
    data.observed_duration_ms = Math.round(performance.now() - trialStartedAt);
  },
  on_finish: finishExperiment,
});

const plan = createPlan(items => jsPsych.randomization.shuffle(items));
const verificationById = new Map(plan.verification.map(item => [item.id, item]));
jsPsych.data.addProperties({
  participant_id: participantId,
  session_id: participantId, // Alias para mantener la compatibilidad con los datos anteriores.
  experiment_version: EXPERIMENT_VERSION,
  image_revision: IMAGE_REVISION,
  started_at: startedAt,
});

function sessionData() {
  return {
    participant_id: participantId,
    session_id: participantId,
    experiment_version: EXPERIMENT_VERSION,
    image_revision: IMAGE_REVISION,
    consent_version: CONSENT_VERSION,
    started_at: startedAt,
    participant: { ...participant },
    timings_ms: TIMING,
    // El plan permite reconstruir el orden de presentación para el análisis.
    orders: {
      phase1: plan.exposure.map(person => person.id),
      phase2: plan.reexposure.map(person => person.id),
      phase3: plan.verification.map(person => ({ id: person.id, is_true: person.isTrue })),
      phase4: plan.recognition.map(person => person.id),
    },
    trials: jsPsych.data.get().values(),
    interactions: jsPsych.data.getInteractionData().values(),
  };
}

function instructions(phase, title, text) {
  return {
    type: htmlKeyboard,
    css_classes: ['instructions-screen'],
    stimulus: `<section class="info-card">${brand}<h1>${title}</h1>${text}<p class="continue-hint">Cuando estés preparado/a, pulsa <kbd>Espacio</kbd>.</p></section>`,
    choices: [' '],
    post_trial_gap: TIMING.instructionGap,
    data: { task: 'instructions', phase },
  };
}

function fixation(phase) {
  const duration = phase === 4 ? TIMING.recognitionFixation : TIMING.fixation;
  return {
    type: htmlKeyboard,
    css_classes: ['experimental-screen'],
    stimulus: '<div class="fixation">+</div>',
    choices: 'NO_KEYS',
    trial_duration: duration,
    data: { task: 'fixation', phase, planned_duration_ms: duration },
  };
}

function photo(person, showName = false) {
  return `<div class="photo-stage">${showName ? `<p class="person-name">${person.name}</p>` : ''}<img class="celebrity-photo" src="${person.image}" alt="Persona presentada" draggable="false"></div>`;
}

function itemData(person, phase, order, task) {
  return {
    phase, task, order_in_phase: order + 1,
    stimulus_id: person.id,
    person_name: person.name,
    image_file: person.file,
    image_url: person.image,
    actual_object: person.object ?? null,
  };
}

function responseLabels(left, right) {
  return `<div class="response-label left"><span>${left}</span><kbd>A</kbd></div><div class="response-label right"><span>${right}</span><kbd>L</kbd></div>`;
}

// Ambas tareas comparten el aspecto de la escala, sin selección inicial.
function ratingScale(name, label, count, captions, className) {
  return `<div class="rating-scale ${className}" style="--scale-count: ${count}" role="radiogroup" aria-label="${label}">
    <div class="scale-track">${Array.from({ length: count }, (_, i) => i + 1).map(value => `
      <label class="scale-choice"><input type="radio" name="${name}" value="${value}" aria-label="${label} ${value}"><span>${value}</span></label>
    `).join('')}</div>
    <div class="scale-captions">${captions.map(([text, column]) => `<span style="grid-column: ${column}">${text}</span>`).join('')}</div>
  </div>`;
}

function familiarityScale(name) {
  return ratingScale(name, 'Familiaridad', 5, [
    ['Para nada', '1'], ['Me suena', '3'], ['Claro que sí', '5'],
  ], 'familiarity-scale');
}

function recognitionScale(name) {
  return ratingScale(name, 'Reconocimiento', 6, [
    ['Seguro de haberlo visto', '1 / span 3'], ['Seguro de que es nuevo', '4 / span 3'],
  ], 'recognition-scale');
}

function enableScaleResponse(responseData) {
  const responseStartedAt = performance.now();
  const scale = root.querySelector('.rating-scale');
  scale.addEventListener('change', event => {
    const response = {
      ...responseData(Number(event.target.value)),
      rt: Math.round(performance.now() - responseStartedAt),
      feedback_duration_ms: TIMING.familiarityFeedback,
    };
    // Mostrar la elección antes de avanzar, sin añadir la espera al tiempo de respuesta.
    scale.classList.add('answered');
    scale.querySelectorAll('input').forEach(input => { input.disabled = true; });
    jsPsych.pluginAPI.setTimeout(() => jsPsych.finishTrial(response), TIMING.familiarityFeedback);
  }, { once: true });
}

const timeline = [];

// 1. Consentimiento y formulario de datos.
timeline.push({
  type: surveyHtmlForm,
  html: consentHtml,
  button_label: 'Empezar Experimento',
  css_classes: ['form-screen'],
  data: { task: 'consent', consent_version: CONSENT_VERSION },
  on_finish: data => {
    data.consent_accepted = true;
    data.consent_at = new Date().toISOString();
  },
});
timeline.push({
  type: surveyHtmlForm,
  html: demographicsHtml,
  button_label: 'Continuar',
  css_classes: ['form-screen'],
  data: { task: 'demographics' },
  on_finish: data => {
    // Guardar únicamente los dos datos demográficos solicitados, también en la respuesta del formulario.
    data.response = { age: Number(data.response.age), sex: data.response.sex.trim() };
    Object.assign(participant, data.response);
    jsPsych.data.addProperties(participant);
  },
});
timeline.push({
  type: fullscreen,
  fullscreen_mode: true,
  css_classes: ['instructions-screen'],
  message: `<section class="info-card">${brand}<h1>Prepara tu espacio</h1><p>Utiliza un ordenador con teclado. Coloca la pantalla frente a ti y evita interrupciones.</p><p>Al continuar activaremos la pantalla completa.</p></section>`,
  button_label: 'Continuar a pantalla completa',
  data: { task: 'fullscreen' },
  on_finish: data => jsPsych.data.addProperties({ fullscreen_entered: data.success }),
});

// Precargamos las 48 imágenes de aprendizaje. El reconocimiento solo presenta nombres.
timeline.push({
  type: preload,
  images: celebrities.map(person => person.image),
  css_classes: ['instructions-screen'],
  message: '<h1>Preparando las imágenes</h1><p>Espera un momento. La tarea comenzará cuando estén todas listas.</p>',
  show_progress_bar: true,
  max_load_time: 180000,
  continue_after_error: false,
  show_detailed_errors: false,
  error_message: '<section class="info-card"><h1>No se han cargado todas las imágenes</h1><p>Comprueba la conexión y recarga la página para volver a empezar. La tarea no ha comenzado.</p></section>',
  data: { task: 'preload' },
});

// 2. Primera fase: familiaridad. La imagen permanece hasta recibir una respuesta.
timeline.push(instructions(1, '¿Conoces a este famoso?', `
  <p>Verás una serie de personas famosas, de una en una, con su nombre.</p>
  <p>Indica cuánto conoces a cada persona seleccionando una opción de esta escala:</p>
  ${familiarityScale('familiarity-example')}
  <p>Las opciones 2 y 4 representan grados intermedios. Cada imagen permanecerá hasta que selecciones tu respuesta.</p>`));
plan.exposure.forEach((person, index) => {
  timeline.push(fixation(1), {
    type: htmlKeyboard,
    css_classes: ['experimental-screen', 'familiarity-screen'],
    stimulus: `<p class="familiarity-question">¿Conoces a este famoso?</p>${photo(person, true)}${familiarityScale('familiarity-response')}`,
    choices: 'NO_KEYS',
    post_trial_gap: TIMING.exposureGap,
    data: itemData(person, 1, index, 'familiarity'),
    on_load: () => enableScaleResponse(value => ({
      response: value - 1, // Mantener el índice 0–4 de los datos anteriores.
      familiarity: value,
    })),
  });
});

// 3. Segunda fase: observar durante al menos 5 segundos y después avanzar con Espacio.
timeline.push(instructions(2, 'Observa de nuevo', `
  <p>Volverás a ver las mismas personas.</p>
  <p>Observa con atención a cada persona famosa y, <strong>sobre todo, el objeto que lleva</strong>. Intenta recordar qué objeto acompaña a cada persona.</p>
  <p>Durante los primeros <strong>5 segundos</strong> solo podrás observar la imagen. Después aparecerá una indicación en azul marino para que pulses la barra espaciadora y continúes.</p>`));
plan.reexposure.forEach((person, index) => {
  timeline.push(fixation(2), {
    type: htmlKeyboard,
    css_classes: ['experimental-screen'],
    stimulus: photo(person, true) + '<p class="reexposure-continue" hidden>Pulsa la barra espaciadora para continuar.</p>',
    choices: 'NO_KEYS',
    post_trial_gap: TIMING.exposureGap,
    data: { ...itemData(person, 2, index, 'reexposure'), minimum_exposure_ms: TIMING.exposure },
    on_load: () => {
      const imageStartedAt = performance.now();
      jsPsych.pluginAPI.setTimeout(() => {
        root.querySelector('.reexposure-continue').hidden = false;
        // Activar el teclado ahora: las pulsaciones anteriores no cuentan.
        jsPsych.pluginAPI.getKeyboardResponse({
          valid_responses: [' '],
          rt_method: 'performance',
          persist: false,
          allow_held_key: false,
          callback_function: response => jsPsych.finishTrial({
            response: response.key,
            rt: response.rt, // Desde la aparición de la indicación.
            rt_from_image_ms: Math.round(performance.now() - imageStartedAt),
          }),
        });
      }, TIMING.exposure);
    },
  });
});

// 4. Tercera fase: únicamente una frase, sin fotografía ni información sobre aciertos.
timeline.push(instructions(3, 'Recuerda los objetos', `
  <p>Leerás frases sobre los objetos que tenían las personas en las imágenes.</p>
  <p>Indica si cada frase coincide con lo que has visto. Responde con el teclado:</p>
  <div class="key-examples"><span><kbd>A</kbd> NO</span><span><kbd>L</kbd> SÍ</span></div>
  <p>La frase permanecerá hasta que respondas. Intenta responder con precisión y sin demorarte innecesariamente.</p>`));
plan.verification.forEach((person, index) => {
  timeline.push(fixation(3), {
    type: htmlKeyboard,
    css_classes: ['experimental-screen'],
    stimulus: `<p class="sentence-stimulus">${person.sentence}</p>${responseLabels('NO', 'SÍ')}`,
    choices: ['a', 'l'],
    data: {
      ...itemData(person, 3, index, 'verification'),
      sentence: person.sentence,
      sentence_index: person.index,
      sentence_is_true: person.isTrue,
      sentence_type: person.isTrue ? 'Verdadera' : 'Falsa',
      stated_object: person.statedObject,
      correct_response_meaning: person.isTrue ? 'SÍ' : 'NO',
    },
    on_finish: data => Object.assign(data, scoreVerificationResponse(person, data.response)),
  });
});

// 5. Tarea distractora. El reloj nunca se reinicia al empezar otra partida.
timeline.push(instructions('distractor', 'Juega al Tetris', `
  <p>Encaja las piezas para completar líneas horizontales. El juego comenzará automáticamente y durará <strong>7 minutos</strong>.</p>
  <p><kbd>←</kbd> <kbd>→</kbd> Mover · <kbd>↑</kbd> Girar · <kbd>↓</kbd> Bajar<br><kbd>Espacio</kbd> Caída rápida</p>
  <p>Si las piezas llegan arriba, pulsa <strong>Volver a jugar (Play Again)</strong>. El contador de líneas volverá a cero al comenzar cada partida.</p>`));
timeline.push({
  type: htmlKeyboard,
  css_classes: ['tetris-screen'],
  stimulus: tetrisHtml,
  choices: 'NO_KEYS',
  trial_duration: TIMING.tetris,
  post_trial_gap: TIMING.instructionGap,
  data: { task: 'tetris', phase: 'distractor', planned_duration_ms: TIMING.tetris },
  on_load: () => { game = startTetris(root, TIMING.tetris); },
  on_finish: data => Object.assign(data, game.stop()),
});

// 6. Cuarta fase: nombres de 48 personas vistas y 48 nuevas, mezclados.
timeline.push(instructions(4, '¿Lo has visto en este estudio?', `
  <p>Ahora verás los nombres de una serie de personas famosas. Algunas ya han aparecido en este estudio y otras son nuevas.</p>
  <p>Indica tu grado de seguridad sobre si cada persona apareció en las imágenes de este estudio. Selecciona una opción del 1 al 6 según estos significados:</p>
  ${recognitionScale('recognition-example')}
  <ol class="recognition-scale-guide">
    <li>Estoy totalmente seguro/a de haberlo visto.</li>
    <li>Estoy bastante seguro/a de haberlo visto.</li>
    <li>Creo que lo he visto, pero tengo poca seguridad.</li>
    <li>Creo que es nuevo, pero tengo poca seguridad.</li>
    <li>Estoy bastante seguro/a de que es nuevo.</li>
    <li>Estoy totalmente seguro/a de que es nuevo.</li>
  </ol>
  <p>Que conozcas al famoso de antes no significa que lo hayas visto en este estudio.</p>
  <p>Cada nombre permanecerá hasta que selecciones tu respuesta.</p>`));
plan.recognition.forEach((person, index) => {
  const verification = verificationById.get(person.id);
  timeline.push(fixation(4), {
    type: htmlKeyboard,
    css_classes: ['experimental-screen', 'recognition-screen'],
    stimulus: `<p class="recognition-question">¿Lo has visto en este estudio?</p><p class="recognition-name">${person.name}</p>${recognitionScale('recognition-response')}`,
    choices: 'NO_KEYS',
    data: {
      ...itemData(person, 4, index, 'recognition'),
      stimulus_type: 'name',
      stimulus_text: person.name,
      image_is_old: person.isOld,
      image_type: person.isOld ? 'Visto' : 'Nuevo',
      correct_response_meaning: person.isOld ? 'Visto' : 'Nuevo',
      // Enlace con la condición previa; la respuesta de fase 3 está en su propia fila.
      phase3_sentence_is_true: verification?.isTrue ?? null,
      phase3_sentence: verification?.sentence ?? null,
    },
    on_load: () => enableScaleResponse(value => ({ response: value, recognition_rating: value })),
    on_finish: data => Object.assign(data, scoreRecognitionResponse(person, data.recognition_rating)),
  });
});

async function finishExperiment() {
  const session = { ...sessionData(), completed: true, finished_at: new Date().toISOString() };
  root.classList.add('finished-screen');
  root.dataset.screen = 'other';
  root.innerHTML = `<section class="info-card">${brand}<h1>Gracias por participar</h1></section>`;
  // El resultado del envío no modifica la pantalla que ve el participante.
  const result = await saveSession(session);
  if (!result.ok) {
    console.error('No se han enviado los resultados a Supabase.', { code: result.code });
  }
}

// Cada carga inicia una sesión nueva. Las respuestas solo viven en memoria hasta el envío final.
jsPsych.run(timeline);
