import test from 'node:test';
import assert from 'node:assert/strict';
import { findingNarration, missionNarration, revealNarration } from '../src/utils/narration.js';

test('Reveal narration presents original scores and handles a missing published score', () => {
  const reveal = { partnerScores: { Morgan: 0, Avery: 62 }, actualScore: 26, discoveries: [{ id: 'reserve' }] };
  const text = revealNarration(reveal);
  assert.match(text, /Morgan estimated 0 out of 100/);
  assert.match(text, /Avery estimated 62 out of 100/);
  assert.match(text, /26 out of 100/);
  assert.match(revealNarration({ expectedScore: 50, actualScore: null }), /does not include a published financial health score/);
});

test('key narration incorporates exact plan figures, period, source and the recommended first action', () => {
  const finding = {
    title: 'Yearly retirement spending need',
    figure: '$89,648.57 / year',
    source: { period: 'average over the 33 years of retirement', basis: 'today’s dollars', report: { page: 5 }, raw: { note: 'Excludes estimated long-term care.' } },
  };
  const text = findingNarration(finding, true);
  assert.match(text, /\$89,648\.57 \/ year/);
  assert.match(text, /33 years of retirement/);
  assert.match(text, /page 5 of the report/);
  assert.match(text, /Excludes estimated long-term care/);
  assert.match(missionNarration({ title: 'Review your current coverage', firstAction: 'Gather your current policy limits' }), /Gather your current policy limits/);
});

test('speech continues across chunks and stopping discards stale browser events', async () => {
  const spoken = [];
  globalThis.window = {
    speechSynthesis: { getVoices: () => [], cancel() {}, speak: utterance => spoken.push(utterance) },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  };
  try {
    const { speechService } = await import('../src/utils/speech.js');
    const completions = [];
    speechService.speak('Your plan lists $89,648.57 per year. You can check page 5.', error => completions.push(error));
    assert.equal(spoken[0].text, 'Your plan lists $89,648.57 per year.');
    spoken[0].onend();
    assert.equal(spoken[1].text, 'You can check page 5.');
    speechService.stop();
    spoken[1].onend();
    assert.deepEqual(completions, []);

    speechService.speak('Your next step is ready.', error => completions.push(error));
    spoken[2].onend();
    assert.deepEqual(completions, [undefined]);
  } finally {
    delete globalThis.window;
  }
});
