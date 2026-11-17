import { createHash } from 'node:crypto';

const voice = process.env.TTS_VOICE_ID;
const directKey = process.env.ELEVENLABS_API_KEY;
const proxyKey = process.env.TEAM_KEY;
const direct = process.env.TTS_PROVIDER === 'elevenlabs' && Boolean(directKey);
const model = direct
  ? (process.env.TTS_MODEL || 'eleven_flash_v2_5').replace(/^eleven-flash-v2\.5$/, 'eleven_flash_v2_5')
  : process.env.OPENROUTER_TTS_MODEL || process.env.TTS_MODEL;
const enabled = process.env.ADVISOR_TTS === 'true' && process.env.MOCK_AI !== 'true' && voice && model && (direct ? directKey : proxyKey);
const cache = new Map();
const pending = new Map();

function speechText(reveal, findingId) {
  if (!reveal || reveal.version !== 2) return null;
  if (findingId == null) {
    const estimate = `Your estimate was ${reveal.expectedScore} out of 100.`;
    const score = reveal.actualScore === null ? 'This plan does not include a score.' : `Your Sherpas plan score is ${reveal.actualScore} out of 100.`;
    return `${estimate} ${score} ${reveal.auditorReaction}`;
  }
  const finding = reveal.discoveries.find(item => item.id === findingId);
  return finding ? [finding.title, finding.explanation, finding.whyItMatters].filter(Boolean).join('. ') : null;
}

async function synthesize(text) {
  const base = (process.env.LLM_PROXY_URL || 'https://llm-hackathon.sherpaswealth.com').replace(/\/$/, '');
  const url = direct
    ? `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`
    : `${base}/v1/audio/speech`;
  const body = direct ? { text, model_id: model } : { input: text, model, voice, response_format: 'mp3' };
  const authorization = direct ? { 'xi-api-key': directKey } : { Authorization: `Bearer ${proxyKey}` };
  const response = await fetch(url, {
    method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
  });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !['audio/mpeg', 'audio/mp3', 'application/octet-stream'].includes(type)) {
    await response.body?.cancel();
    console.warn('Narration provider rejected a request:', response.status);
    return null;
  }
  const audio = Buffer.from(await response.arrayBuffer());
  return audio.length && audio.length <= 1_500_000 ? audio : null;
}

export async function sendNarration(req, res) {
  if (!enabled) return res.sendStatus(404);
  const { sessionId, findingId } = req.body || {};
  const text = speechText(req.auditEngine.getSession(sessionId)?.reveal, findingId)?.slice(0, 1500);
  if (!text) return res.sendStatus(404);
  const key = createHash('sha256').update(sessionId).update(text).digest('hex');
  let audio = cache.get(key);
  if (!audio) {
    if (!pending.has(key)) {
      if (pending.size >= 8) return res.sendStatus(503);
      pending.set(key, synthesize(text).catch(() => null).finally(() => pending.delete(key)));
    }
    audio = await pending.get(key);
    if (!audio) return res.sendStatus(502);
    if (cache.size >= 48 && !cache.has(key)) cache.delete(cache.keys().next().value);
    cache.set(key, audio);
  }
  return res.type('audio/mpeg').send(audio);
}
