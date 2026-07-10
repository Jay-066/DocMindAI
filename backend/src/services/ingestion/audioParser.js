const fs = require('fs');
const config = require('../../config/env');
const { getOpenAIClient } = require('../aiClients');

/**
 * Transcribes audio via OpenAI's Whisper API, requesting verbose_json
 * so we get segment-level timestamps. Each segment becomes a unit with
 * a timestamp range, so citations can point to "00:03:12" in the audio.
 */
async function parseAudio(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const openai = getOpenAIClient();

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream,
    model: config.openai.whisperModel,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const segments = transcription.segments || [];
  const units = segments
    .map((seg) => ({
      text: (seg.text || '').trim(),
      sourceLabel: formatTimestampLabel(seg.start, seg.end),
      timestampStart: seg.start,
      timestampEnd: seg.end,
    }))
    .filter((u) => u.text.length > 0);

  // Fallback: if no segments returned, use the full transcript as one unit
  if (units.length === 0 && transcription.text) {
    units.push({ text: transcription.text.trim(), sourceLabel: 'Audio transcript' });
  }

  return {
    units,
    pageCount: null,
    durationSeconds: transcription.duration || null,
  };
}

function formatTimestampLabel(startSec, endSec) {
  const fmt = (s) => {
    const mins = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(s % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };
  return `${fmt(startSec)} - ${fmt(endSec)}`;
}

module.exports = { parseAudio, formatTimestampLabel };
