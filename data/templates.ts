export interface Template {
    id: string;
    title: string;
    genre: string;
    description: string;
    prompt: string;
    imageUrl: string;
    color: string;
}

export interface Showcase {
    id: string;
    title: string;
    author: string;
    imageUrl: string;
    duration: string;
    views: string;
}

export const CREATIVE_TEMPLATES: Template[] = [
    {
        id: 't_cyberpunk',
        title: 'Neo-Tokyo Noir',
        genre: 'Cyberpunk',
        description: 'Rainy neon streets, hackers, and rogue AI.',
        color: 'from-pink-600 to-purple-900',
        imageUrl: 'https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=600&auto=format&fit=crop', // Abstract neon
        prompt: "A gritty cyberpunk noir scene in Neo-Tokyo 2099. A rogue hacker named Kael runs through a neon-lit alleyway, chased by Arasaka drones. It is raining heavily. The atmosphere is dark, tense, and illuminated by hologram advertisements."
    },
    {
        id: 't_fantasy',
        title: 'Isekai Adventure',
        genre: 'Fantasy',
        description: 'Magic guilds, dragons, and endless green fields.',
        color: 'from-emerald-600 to-teal-900',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop', // Nature/Fantasy vibe
        prompt: "A breathtaking fantasy opening scene. Elara, a young mage, stands on a cliff overlooking the Floating Kingdom of Aethelgard. Dragons fly in the distance. The sun is setting, casting a golden glow. She holds a glowing crystal staff."
    },
    {
        id: 't_slice',
        title: 'Café Melancholy',
        genre: 'Slice of Life',
        description: 'Lo-fi vibes, coffee, and quiet introspection.',
        color: 'from-orange-400 to-amber-900',
        imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop', // Coffee shop
        prompt: "A cozy, lo-fi slice of life scene inside a small jazz cafe in Tokyo during winter. Steam rises from a hot cup of coffee. A cat sleeps on the counter. The protagonist, Kenji, looks out the frosted window, thinking about his lost love."
    },
    {
        id: 't_horror',
        title: 'The Abandoned Station',
        genre: 'Horror',
        description: 'Glitching lights, silence, and psychological fear.',
        color: 'from-red-900 to-black',
        imageUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600&auto=format&fit=crop', // Dark background
        prompt: "A psychological horror scene in an abandoned subway station. The lights flickers ominously. Silence is deafening. The protagonist hears footsteps echoing from the dark tunnel but sees no one. The camera uses a Dutch Angle to create unease."
    }
];

export const SHOWCASE_CLIPS: Showcase[] = [
    {
        id: 's_1',
        title: 'Mecha Battle: Unit 01',
        author: 'StudioTrigger_Fan',
        imageUrl: 'https://images.unsplash.com/photo-1612151855475-877969f4a6cc?q=80&w=600&auto=format&fit=crop',
        duration: '0:45',
        views: '12.5k'
    },
    {
        id: 's_2',
        title: 'Midnight Run',
        author: 'AkiraLover',
        imageUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=600&auto=format&fit=crop',
        duration: '1:12',
        views: '8.2k'
    },
    {
        id: 's_3',
        title: 'The Last Cherry Blossom',
        author: 'ShinkaiVibes',
        imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop',
        duration: '2:30',
        views: '34k'
    }
];