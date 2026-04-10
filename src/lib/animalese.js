/**
 * ES module wrapper for animalese synthesis (github.com/Acedio/animalese.js).
 * Audio asset animalese.wav is CC BY 4.0; code MIT — see vendor LICENSE in upstream repo.
 */
import { RIFFWAVE } from '../vendor/riffwave.js';

let letterLibrary = null;
let loadPromise = null;

export function loadAnimaleseLibrary(wavUrl) {
  if (letterLibrary) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = fetch(wavUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`animalese wav ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        letterLibrary = new Uint8Array(buf);
      });
  }
  return loadPromise;
}

function shortenWord(str) {
  if (str.length > 1) return str[0] + str[str.length - 1];
  return str;
}

/**
 * @param {string} script
 * @param {{ shorten?: boolean, pitch?: number }} options
 * @returns {string} data URI for audio/wav
 */
export function synthesizeAnimalese(script, options = {}) {
  const { shorten = false, pitch = 1 } = options;
  if (!letterLibrary) throw new Error('Animalese library not loaded');

  let processed = script.slice(0, 220);
  if (shorten) {
    processed = processed
      .replace(/[^a-z]/gi, ' ')
      .split(' ')
      .map(shortenWord)
      .join('');
  }
  if (!processed.length) processed = ' ';

  const data = [];
  const sampleFreq = 44100;
  const libraryLetterSecs = 0.15;
  const librarySamplesPerLetter = Math.floor(libraryLetterSecs * sampleFreq);
  const outputLetterSecs = 0.075;
  const outputSamplesPerLetter = Math.floor(outputLetterSecs * sampleFreq);

  for (let cIndex = 0; cIndex < processed.length; cIndex++) {
    const c = processed.toUpperCase()[cIndex];
    if (c >= 'A' && c <= 'Z') {
      const libraryLetterStart =
        librarySamplesPerLetter * (c.charCodeAt(0) - 'A'.charCodeAt(0));
      for (let i = 0; i < outputSamplesPerLetter; i++) {
        data[cIndex * outputSamplesPerLetter + i] =
          letterLibrary[44 + libraryLetterStart + Math.floor(i * pitch)];
      }
    } else {
      for (let i = 0; i < outputSamplesPerLetter; i++) {
        data[cIndex * outputSamplesPerLetter + i] = 127;
      }
    }
  }

  const wave = new RIFFWAVE();
  wave.header.sampleRate = sampleFreq;
  wave.header.numChannels = 1;
  wave.Make(data);
  return wave.dataURI;
}
