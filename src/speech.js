let speechVoice = null;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  speechVoice =
    voices.find(v => /^en[-_]GB$/i.test(v.lang)) ||
    voices.find(v => /^en[-_]/i.test(v.lang)) ||
    null;
}

export function initSpeech() {
  if (!('speechSynthesis' in window)) return;
  pickVoice();
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function canSpeak() {
  return speechVoice !== null;
}

export function speak(text) {
  if (!speechVoice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = speechVoice;
  u.lang = speechVoice.lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}
