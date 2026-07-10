const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const { parseAudio } = require('./audioParser');
const { uploadDir } = require('../../middleware/upload');

/**
 * Video ingestion pipeline:
 * 1. Extract the audio track to a temp .mp3 using ffmpeg
 * 2. Run it through the same Whisper transcription as parseAudio
 * 3. Clean up the temp audio file
 *
 * Requires ffmpeg to be installed on the host machine and available
 * on PATH (fluent-ffmpeg shells out to it).
 */
function extractAudioTrack(videoPath) {
  return new Promise((resolve, reject) => {
    const tempAudioPath = path.join(uploadDir, `${uuidv4()}_extracted.mp3`);

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('end', () => resolve(tempAudioPath))
      .on('error', (err) => reject(new Error(`ffmpeg audio extraction failed: ${err.message}`)))
      .save(tempAudioPath);
  });
}

async function parseVideo(filePath) {
  const tempAudioPath = await extractAudioTrack(filePath);

  try {
    const result = await parseAudio(tempAudioPath);
    // Relabel source to indicate it came from video, keep timestamps
    result.units = result.units.map((u) => ({
      ...u,
      sourceLabel: `Video ${u.sourceLabel}`,
    }));
    return result;
  } finally {
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
  }
}

module.exports = { parseVideo };
