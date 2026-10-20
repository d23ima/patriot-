import { VideoProject, Scene } from '../types/video';

export const STOCK_DOCUMENTARY_IMAGES = [
  {
    id: 'img_cosmos',
    title: 'Cosmic Galaxy & Spiral Dust',
    url: '/src/assets/images/doc_cosmos_galaxy_1792494749313.jpg',
  },
  {
    id: 'img_microchip',
    title: 'Silicon Wafer & Circuit Pathways',
    url: '/src/assets/images/doc_microchip_silicon_1792494750894.jpg',
  },
  {
    id: 'img_library',
    title: 'Ancient Archives & Historical Stacks',
    url: '/src/assets/images/doc_ancient_library_1792494750754.jpg',
  },
  {
    id: 'img_quantum',
    title: 'Quantum Cryogenic Chamber',
    url: '/src/assets/images/doc_quantum_physics_1792494750340.jpg',
  },
];

// Helper to construct a realistic 20-30 minute scene structure
function buildDocumentaryScenes(
  chapters: { title: string; paragraphs: string[]; defaultImage: string }[],
  targetDurationMin: number
): Scene[] {
  const scenes: Scene[] = [];
  const effects: ('zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'center-drift' | 'pan-top-down')[] = [
    'zoom-in',
    'pan-left',
    'zoom-out',
    'pan-right',
    'center-drift',
    'pan-top-down',
  ];

  let sceneCount = 0;
  // Calculate total scenes needed for smooth 20-30m video (average 30-36s per visual shot)
  const totalTargetSec = targetDurationMin * 60;
  
  // Flatten paragraphs
  const allShots: { chapterNum: number; chapterTitle: string; text: string; image: string }[] = [];
  chapters.forEach((ch, chIdx) => {
    ch.paragraphs.forEach((p) => {
      allShots.push({
        chapterNum: chIdx + 1,
        chapterTitle: ch.title,
        text: p,
        image: ch.defaultImage,
      });
    });
  });

  const baseDuration = Math.round(totalTargetSec / Math.max(1, allShots.length));

  allShots.forEach((shot, idx) => {
    sceneCount++;
    const words = shot.text.split(/\s+/).length;
    // Pacing at ~135 WPM plus cinematic visual pauses
    const durationSec = Math.max(20, Math.min(50, Math.round((words / 135) * 60) + 4));

    scenes.push({
      id: `scene_${sceneCount}`,
      chapterNumber: shot.chapterNum,
      chapterTitle: shot.chapterTitle,
      sceneTitle: `Shot ${sceneCount} · ${shot.text.slice(0, 30)}...`,
      narrationText: shot.text,
      estimatedDurationSec: durationSec,
      kenBurnsEffect: effects[idx % effects.length],
      transition: idx % 4 === 0 ? 'fade-black' : 'crossfade',
      imageUrl: shot.image,
      visualPrompt: `Documentary archival shot illustrating: ${shot.text.slice(0, 70)}`,
      subtitleHeadline: shot.text.slice(0, 48),
    });
  });

  // Rebalance durations to precisely match target duration
  const currentTotal = scenes.reduce((acc, s) => acc + s.estimatedDurationSec, 0);
  const ratio = totalTargetSec / (currentTotal || 1);
  scenes.forEach((s) => {
    s.estimatedDurationSec = Math.max(15, Math.round(s.estimatedDurationSec * ratio));
  });

  return scenes;
}

export const PRESET_PROJECTS: VideoProject[] = [
  {
    id: 'preset_cosmic_25m',
    title: 'The Architecture of Thought: 25-Minute Cognitive Odyssey',
    targetMinutes: 25,
    wordsPerMinute: 135,
    soundtrack: 'documentary-pulse',
    soundtrackVolume: 0.28,
    voiceName: 'Charon',
    voiceTone: 'archival-historian',
    audioPostEffect: 'warm-analog',
    aspectRatio: '16:9',
    showSubtitles: true,
    subtitleFont: 'Playfair Display',
    subtitleFontSize: 24,
    subtitleSyncMode: 'karaoke-word',
    subtitleHighlightColor: '#fbbf24',
    subtitlePosition: 'lower-third',
    showChapterCards: true,
    showTimecodeOverlay: false,
    createdAt: Date.now(),
    script: `Chapter 1: The Spark of Curiosity
Before symbols were carved into stone or etched onto clay, human intelligence emerged as a dialogue with the natural cosmos. The night sky served as humanity's very first library—a celestial calendar charting seasonal migrations and cosmic rhythm.
To gaze upward was to confront infinity, asking who we are, where we came from, and why we seek to understand.

Chapter 2: The Physical Record
In the centuries that followed, knowledge demanded physical permanence. Scribes in Alexandria, Baghdad, and Florence illuminated manuscripts line by line, preserving philosophical inquiries across generations.
Each archived codex formed an anchor of human remembrance, enduring floods, fires, and the erosion of time.
Within quiet library walls, the collective thoughts of millennia waited patiently for future minds to rekindle them.

Chapter 3: The Silicon Transition
When the twenty-first century arrived, the ink of paper was supplanted by microscopic pathways etched upon crystalline silicon. Transistors, once measured in millimeters, shrank to the width of nanometers, compressing global libraries into microprocessors smaller than a postage stamp.
Information ceased to be static parchment; it became electric velocity, pulsating at billions of cycles per second.
We had created machines capable of modeling quantum lattices, mapping genomes, and traversing stellar coordinates.

Chapter 4: The Quantum Frontier
Today, humanity stands at the threshold of quantum computation and artificial synthesis. Cryogenic chambers chilled to temperatures colder than deep space now manipulate individual quantum bits in superpositions of reality.
The boundary between observer and machine dissolves into a shared inquiry into the fundamental laws of nature.
As we look forward into the next epoch, our tools reflect our oldest desire: to map the unknowable and build understanding.`,
    scenes: buildDocumentaryScenes(
      [
        {
          title: 'Chapter 1: The Spark of Curiosity',
          defaultImage: STOCK_DOCUMENTARY_IMAGES[0].url,
          paragraphs: [
            "Before symbols were carved into stone or etched onto clay, human intelligence emerged as a dialogue with the natural cosmos. The night sky served as humanity's very first library.",
            'To gaze upward was to confront infinity, asking who we are, where we came from, and why we seek to understand.',
            'Ancient observers recognized cyclical motions in constellations, translating seasonal patterns into agrarian calendars and communal rituals.',
            'This celestial inquiry was not merely observational—it marked the dawn of conceptual thinking and abstract modeling.',
            'Every campfire under the stars became a classroom where oral narratives stitched human identity across generations.',
            'From these quiet night watches sprang mathematics, myth, and the persistent longing to record our place in the universe.',
            'The cosmos was both mirror and question mark, reflecting humanity’s deepest aspirations across the vast void.',
            'In this inaugural era, the universe was humanity’s grandest visual canvas and unwritten scripture.',
          ],
        },
        {
          title: 'Chapter 2: The Physical Record',
          defaultImage: STOCK_DOCUMENTARY_IMAGES[2].url,
          paragraphs: [
            'In the centuries that followed, transient oral traditions yielded to the permanence of script and paper.',
            'Scribes in Alexandria, Baghdad, and Cordoba transcribed philosophical debates, anatomical treatises, and geometric proofs.',
            'Libraries evolved into citadels of cognition, safeguarding fragile parchment against conquest and decay.',
            'A single illuminated folio represented months of patient labor, grinding pigments and inking letterforms with feather quills.',
            'Knowledge was no longer tethered to mortal memory; thoughts could outlive emperors, dynasties, and centuries.',
            'Scholars walked arched corridors in deep reflection, engaging in timeless dialogues with thinkers separated by centuries.',
            'The invention of the movable type press ignited a knowledge cascade, democratizing ideas across continents.',
            'Physical books became portable cathedrals of thought, laying the bedrock of modern scientific enquiry.',
          ],
        },
        {
          title: 'Chapter 3: The Silicon Transition',
          defaultImage: STOCK_DOCUMENTARY_IMAGES[1].url,
          paragraphs: [
            'By the mid-twentieth century, the repository of human intellect took a radical structural leap from paper to crystalline silicon.',
            'Engineers discovered that microscopic switches etched into pure silica could manipulate mathematical logic at the speed of light.',
            'The transistor miniaturized relentlessly, doubling in density every two years in an unprecedented mechanical sprint.',
            'Printed circuit boards became miniature metropolises of copper traces, shuttling billions of electrons per second.',
            'Supercomputers calculated planetary orbits, modeled atmospheric turbulence, and sequenced the DNA code of life.',
            'The physical footprint of human memory collapsed from library corridors to wafers thinner than human hair.',
            'Every digital pixel and calculated polygon became an artifact of this silicon revolution.',
            'Humanity had built an electronic nervous system that wrapped the entire globe in instantaneous communication.',
          ],
        },
        {
          title: 'Chapter 4: The Quantum Frontier',
          defaultImage: STOCK_DOCUMENTARY_IMAGES[3].url,
          paragraphs: [
            'Now, in our current millennium, computing enters realms where classical physics yields to quantum mechanics.',
            'Cryogenic dilution refrigerators cool superconducting quantum processors to temperatures colder than the vacuum of deep space.',
            'Woven golden coaxial cables channel microwave pulses to manipulate qubits suspended in fragile quantum coherence.',
            'Problems intractable for centuries—molecular simulation, advanced materials discovery, complex cryptography—come within reach.',
            'This convergence of machine intelligence and fundamental physics redefines what it means to calculate and discover.',
            'Yet behind every quantum processor and silicon wafer remains the same original impulse that stirred our ancient ancestors.',
            'We are still stargazers sitting by the fire, seeking to comprehend the immense tapestry of existence.',
            'As this twenty-five minute journey concludes, our shared voyage into the architecture of thought is only just beginning.',
          ],
        },
      ],
      25
    ),
  },
];
