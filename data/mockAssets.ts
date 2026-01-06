import { Asset } from '../types';

export const MOCK_ASSETS: Asset[] = [
  // BGM
  {
    id: 'bgm_epic_01',
    type: 'BGM',
    name: 'Battle of the Gods',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    tags: ['Action', 'Epic', 'Orchestral'],
    duration: 120
  },
  {
    id: 'bgm_sad_piano',
    type: 'BGM',
    name: 'Rainy Tears',
    url: 'https://cdn.pixabay.com/download/audio/2021/11/24/audio_823c91a32a.mp3',
    tags: ['Sad', 'Piano', 'Emotional'],
    duration: 150
  },
  {
    id: 'bgm_cyberpunk',
    type: 'BGM',
    name: 'Neon City Drive',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_223403a558.mp3',
    tags: ['Cyberpunk', 'Synthwave', 'Fast'],
    duration: 180
  },
  
  // SFX
  {
    id: 'sfx_rain_01',
    type: 'SFX',
    name: 'Heavy Rain',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_0172828b18.mp3',
    tags: ['Nature', 'Weather'],
    duration: 5
  },
  {
    id: 'sfx_sword_clash',
    type: 'SFX',
    name: 'Katana Clash',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c9c8a9c79d.mp3',
    tags: ['Fight', 'Weapon'],
    duration: 1
  },
  {
    id: 'sfx_explosion',
    type: 'SFX',
    name: 'Distant Explosion',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_51ccf0f622.mp3',
    tags: ['Action', 'Boom'],
    duration: 3
  },
  {
    id: 'sfx_whoosh',
    type: 'SFX',
    name: 'Fast Whoosh',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_8935c1a742.mp3',
    tags: ['Transition', 'Movement'],
    duration: 1
  },

  // Overlays (Represented as images/video placeholders for now)
  {
    id: 'ov_speedlines',
    type: 'OVERLAY',
    name: 'Anime Speed Lines',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtM3ZtM3ZtM3ZtM3ZtM3ZtM3ZtM3Zt/3o7TKSjRrfIPjeiVyM/giphy.gif', // Placeholder
    tags: ['Action', 'Visual'],
    duration: 0
  },
  {
    id: 'ov_dust',
    type: 'OVERLAY',
    name: 'Floating Dust',
    url: 'https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif', // Placeholder
    tags: ['Atmosphere', 'Visual'],
    duration: 0
  }
];