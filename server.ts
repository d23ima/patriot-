import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to initialize GoogleGenAI with proper User-Agent telemetry
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// Endpoint: Parse & Chapterize Script into 20-30 Minute Video Sequences
app.post('/api/gemini/parse-script', async (req, res) => {
  try {
    const { script, targetMinutes = 25, wordsPerMinute = 135, style = 'documentary' } = req.body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Script content is required' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      // Fallback rule-based parsing if no API key is available
      const parsedScenes = fallbackParseScript(script, targetMinutes, wordsPerMinute);
      return res.json({ scenes: parsedScenes, source: 'algorithmic' });
    }

    const systemPrompt = `You are a master documentary director, video editor, and screenwriter for long-form video production (specifically 20 to 30 minutes duration).
Your task is to analyze an incoming script and break it down into a comprehensive, perfectly paced sequence of scenes for a ${targetMinutes}-minute long video.
Total Target Duration: ${targetMinutes} minutes (~${targetMinutes * 60} seconds).
Standard speaking pacing: ~${wordsPerMinute} words per minute.
Style: ${style} (e.g. historical documentary, deep-dive video essay, science presentation).

Return a JSON array of scenes. Each scene object must have:
- id: string (e.g. "scene_1")
- chapterTitle: string (title of the documentary chapter or section)
- chapterNumber: number (1, 2, 3...)
- sceneTitle: string (short title for this specific shot/scene)
- narrationText: string (the actual spoken narration for this scene)
- estimatedDurationSec: number (scene length in seconds, typically 15 to 45 seconds per image/shot to maintain visual engagement across a 20-30m timeline)
- kenBurnsEffect: string (one of: "zoom-in", "zoom-out", "pan-left", "pan-right", "pan-top-down", "center-drift")
- transition: string (one of: "crossfade", "fade-black", "cut", "subtle-slide")
- visualPrompt: string (a descriptive prompt for the visual or image needed in this scene)
- subtitleHeadline: string (optional lower-third caption or topic headline for on-screen display)

Ensure that the total sum of estimatedDurationSec across all scenes approaches the desired runtime (~${targetMinutes * 60} seconds).
Return pure JSON conforming to this schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Script input:\n\n${script}\n\nTarget runtime: ${targetMinutes} minutes. Please segment into cohesive cinematic scenes with narrative flow and visual directions.` },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const rawText = response.text || '[]';
    let scenes = [];
    try {
      scenes = JSON.parse(rawText);
    } catch {
      // Fallback to algorithmic if model JSON was malformed
      scenes = fallbackParseScript(script, targetMinutes, wordsPerMinute);
    }

    return res.json({ scenes, source: 'gemini' });
  } catch (error: any) {
    console.error('Error parsing script with Gemini:', error);
    // Graceful fallback to algorithmic parser
    const { script, targetMinutes = 25, wordsPerMinute = 135 } = req.body;
    const fallbackScenes = fallbackParseScript(script || '', targetMinutes, wordsPerMinute);
    return res.json({ scenes: fallbackScenes, source: 'fallback', message: error.message });
  }
});

// Endpoint: Generate Full-Length Gemini TTS Speech for a scene
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const {
      text,
      voice = 'Kore',
      style,
      tonePreset = 'archival-historian',
      customPrompt = '',
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Using browser speech synthesis fallback.',
        fallback: true,
      });
    }

    // Resolve distinctive non-trend voice tone style prompts
    const toneMap: Record<string, string> = {
      'archival-historian':
        'Vintage 1940s British archival documentary narrator, slow dignified cadence, deep gravitas, scholarly warmth, mid-Atlantic diction, reminiscent of historic BBC audio essays and Ken Burns archives.',
      'cosmic-philosopher':
        'Ethereal contemplative philosopher, slow hypnotic delivery, spacious philosophical pauses, low resonant acoustic timbre, deep cosmic awe.',
      'noir-monologue':
        '1950s cinematic noir monologue, smoky low-register gravel, cynical dry cadence, rhythmic syncopated punctuation, intimate detective chronicle.',
      'warm-poetic':
        'Intimate poetic storyteller, close-mic acoustic warmth, gentle nuanced inflections, unhurried reflective pauses, authentic human storytelling.',
      'cybernetic-scholar':
        'Calm hyper-articulate polymath professor, pristine acoustic articulation, measured intellectual gravity, rhythmic clarity.',
    };

    const finalStyle =
      tonePreset === 'custom' && customPrompt
        ? customPrompt
        : style || toneMap[tonePreset] || toneMap['archival-historian'];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 1500), // safe chunk limit per scene
              speechMetadata: {
                style: finalStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // Options: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS', fallback: true });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: error.message || 'TTS generation failed', fallback: true });
  }
});

// Endpoint: Generate AI scene image on demand
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '16:9' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `High quality cinematic 16:9 documentary frame photograph: ${prompt}. Cinematic lighting, Leica 35mm lens, atmospheric depth, realistic archive or documentary aesthetic.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
        },
      },
    });

    let imageUrl: string | null = null;
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to generate image' });
    }

    return res.json({ imageUrl });
  } catch (error: any) {
    console.error('Image gen error:', error);
    return res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

// Algorithmic Fallback Script Segmenter
function fallbackParseScript(script: string, targetMinutes: number, wpm: number) {
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const cleanParagraphs = paragraphs.length > 0 ? paragraphs : [
    'Introduction to our journey through this long-form exploration.',
    'Exploring the foundational mechanics and historical context of the subject.',
    'Examining the key breakthrough events and transformative milestones.',
    'Analyzing the deeper implications, modern consequences, and future horizons.'
  ];

  const totalTargetSec = targetMinutes * 60;
  // Calculate average duration per scene to cover target time (or at least 25s per scene)
  const targetSceneCount = Math.max(cleanParagraphs.length, Math.round(totalTargetSec / 30));
  const sceneDuration = Math.round(totalTargetSec / Math.max(1, targetSceneCount));

  const effects = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'center-drift', 'pan-top-down'];
  const transitions = ['crossfade', 'crossfade', 'fade-black', 'subtle-slide', 'crossfade'];

  const scenes = [];
  let currentChapter = 1;
  let currentChapterTitle = 'Chapter 1: The Origin';

  for (let i = 0; i < targetSceneCount; i++) {
    const pIndex = i % cleanParagraphs.length;
    let text = cleanParagraphs[pIndex];

    // Detect chapter headings if any
    if (text.startsWith('#') || text.toLowerCase().startsWith('chapter') || text.toLowerCase().startsWith('part')) {
      currentChapterTitle = text.replace(/^#+\s*/, '');
      currentChapter++;
      text = cleanParagraphs[(pIndex + 1) % cleanParagraphs.length] || text;
    } else if (i > 0 && i % Math.max(3, Math.floor(targetSceneCount / 5)) === 0) {
      currentChapter++;
      currentChapterTitle = `Chapter ${currentChapter}: Section Phase ${currentChapter}`;
    }

    const words = text.split(/\s+/).length;
    // Pacing calculation
    const computedSec = Math.max(15, Math.min(60, Math.round((words / wpm) * 60) || sceneDuration));

    scenes.push({
      id: `scene_${i + 1}`,
      chapterNumber: currentChapter,
      chapterTitle: currentChapterTitle,
      sceneTitle: `Shot ${i + 1} · ${text.slice(0, 32)}...`,
      narrationText: text,
      estimatedDurationSec: computedSec,
      kenBurnsEffect: effects[i % effects.length],
      transition: transitions[i % transitions.length],
      visualPrompt: `Documentary visual illustrating ${text.slice(0, 80)}`,
      subtitleHeadline: text.slice(0, 45),
    });
  }

  return scenes;
}

// Dev & Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Chronicle30 Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
