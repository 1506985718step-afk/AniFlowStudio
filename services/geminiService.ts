import { GoogleGenAI, Modality } from "@google/genai";
import { ScriptResponse, AspectRatio, ShotSize, CameraAngle } from "../types";

const SYSTEM_PROMPT = `
You are the "StoryDirector" Agent of AniFlow, a professional Anime Production Engine.
Your goal is to take a user's short idea and expand it into a concise, visually stunning anime storyboard sequence.

**ROLE: EXPERT CINEMATOGRAPHER & ACTING COACH**
You must apply professional film theory and ensure character ACTING is dynamic.
- **AVOID STATIC EXPRESSIONS**: Characters must react to the situation. If they are fighting, they should look angry or desperate. If they are sad, they should be crying.
- **AVOID MISTAKES**: Do not describe a "Wide Shot" if the visual detail requires seeing tears on a cheek.

Output must be RAW JSON (no markdown formatting) following this structure:
{
  "title": "Scene Title",
  "location_visuals": "A detailed, STATIC description of the environment that DOES NOT CHANGE. Describe the lighting, colors, background objects, and weather. Do not describe characters here.",
  "projectSettings": {
    "global_style": "90s Cyberpunk Anime Style, High Contrast, Neon Lighting",
    "bgm_asset_id": "bgm_epic_01"
  },
  "characters": [
    {
      "name": "Character Name",
      "core_traits": "visual traits list",
      "appearance_prompt": "highly detailed visual description for Stable Diffusion, focusing on hair, eyes, clothing, AND SPECIFIC HELD ITEMS OR WEAPONS (e.g., 'holding a glowing blue katana'). This description must be rigid.",
      "voice_id": "Puck" 
    }
  ],
  "shots": [
    {
      "id": 1,
      "scene_description": "Narrative description of what happens",
      "visual_prompt": "English visual description for image generation. DESCRIBE THE ACTION VIVIDLY.",
      "camera_movement": "Pan/Zoom/Static/Tracking/Shake",
      "camera_angle": "Low Angle/High Angle/Eye Level/Dutch Angle/Overhead",
      "shot_size": "Close-up/Medium Shot/Wide Shot/Extreme Close-up/Cowboy Shot",
      "camera_reasoning": "Brief explanation of WHY this angle/size was chosen.",
      "character_emotion": "Specific emotion instructions (e.g., 'Terrified scream, eyes wide open', 'Smug grin', 'Crying uncontrollably'). DO NOT USE 'NEUTRAL' unless necessary.",
      "dialogue": "Character dialogue line",
      "character_focus": "Name of character in shot (must match character list name exactly) or 'None'",
      "duration": 3.5,
      "sound_effect": "Rain/Explosion/Silence"
    }
  ]
}

Rules:
1. **GENERATE EXACTLY 5 SHOTS**: Create a complete mini-arc with emotional progression (Start -> Conflict -> Climax -> Resolution).
2. **EMOTION VARIATION**: Every shot MUST have a distinct 'character_emotion'.
3. Visual prompts should include lighting and atmosphere keywords.
4. If the scene is action-heavy, use dynamic angles (Dutch Angle, Fisheye).
5. Ensure character names in 'shots' match 'characters' list exactly.
6. voice_id should be one of: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'.
7. **CHARACTER CONSISTENCY**: In 'appearance_prompt', describe the outfit and any handheld props in extreme detail.
8. **ENVIRONMENT CONSISTENCY**: The 'location_visuals' field MUST be detailed enough to reuse for every shot.
`;

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
}

export const generateAnimeScript = async (topic: string): Promise<ScriptResponse> => {
  try {
    const ai = getClient();
    
    // Use gemini-3-flash-preview for better instruction following on complex JSON tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional anime script based on this idea: "${topic}". Make sure to generate exactly 5 distinct shots that tell a mini-story with dynamic character acting.`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    let text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    // Safety: Remove markdown code blocks if the model includes them despite MIME type
    text = text.replace(/```json\n?|\n?```/g, "").trim();

    const data = JSON.parse(text) as ScriptResponse;
    return data;

  } catch (error) {
    console.error("AniFlow Generation Error:", error);
    throw error;
  }
};

/**
 * Generates an image with enhanced Consistency Logic (Character + Environment).
 */
export const generateImage = async (
    basePrompt: string, 
    characterAppearance?: string, 
    globalStyle: string = "Anime style, high quality, 4k",
    aspectRatio: AspectRatio = "16:9",
    referenceImageBase64?: string, // The anchor image for Character
    seed: number = 42,
    locationPrompt?: string, // The anchor text for Environment
    shotSize?: ShotSize,     // Directing the lens
    cameraAngle?: CameraAngle, // Directing the lens
    characterEmotion?: string // NEW: Override expression
): Promise<string> => {
    try {
        const ai = getClient();
        
        // --- PROMPT ENGINEERING FOR CONSISTENCY & CINEMATOGRAPHY ---
        
        const stylePrefix = `Art Style: ${globalStyle}.`;
        const envPart = locationPrompt ? `PERMANENT SETTING: ${locationPrompt}` : "";
        const charPart = characterAppearance ? `CHARACTER IDENTITY: ${characterAppearance}` : "";
        
        // --- LENS LANGUAGE INJECTION ---
        const lensPart = (shotSize || cameraAngle) 
            ? `CAMERA COMPOSITION: ${shotSize || ''} ${cameraAngle ? `, ${cameraAngle}` : ''}.` 
            : "";
        
        // --- DYNAMIC ACTING INJECTION ---
        // We explicitly tell the model that the emotion is a "temporary override" to the reference.
        const actingPart = characterEmotion 
            ? `CURRENT FACIAL EXPRESSION: ${characterEmotion} !!!IMPORTANT!!!` 
            : "CURRENT FACIAL EXPRESSION: Dynamic and fitting the scene.";

        // We explicitly tell the model that the reference image is the TRUTH.
        // MODIFIED INSTRUCTION: Explicitly permit expression changes.
        const refInstruction = referenceImageBase64 
            ? "CRITICAL INSTRUCTION: The first input image is the visual GROUND TRUTH for the character's identity (Hair style, Eye color, Clothes, Face Shape). You MUST retain the identity. HOWEVER, YOU MUST CHANGE THE FACIAL EXPRESSION to match the 'CURRENT FACIAL EXPRESSION' description. Do NOT copy the emotion from the reference image." 
            : "";

        const fullPrompt = `
        ${stylePrefix}
        ${lensPart}
        
        ${refInstruction}
        
        ${envPart}
        
        ${charPart}
        
        ${actingPart}
        
        CURRENT SHOT ACTION: ${basePrompt}
        
        NEGATIVE CONSTRAINTS: Do not change the character's hair color. Do not change the character's clothing. Do not change the background location. Do not morph the face shape. Keep the art style consistent.
        `;

        // Construct Content Parts
        const parts: any[] = [];
        
        // If we have a reference image (Character Portrait), pass it FIRST
        if (referenceImageBase64) {
             const cleanBase64 = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
             parts.push({
                 inlineData: {
                     mimeType: 'image/png', // Assuming PNG for generated assets
                     data: cleanBase64
                 }
             });
        }

        parts.push({ text: fullPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // 2.5 Flash Image is multimodal capable
            contents: {
                parts: parts
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                },
                // Use a consistent seed for the whole project to keep art style similar
                seed: seed 
            }
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        
        throw new Error("No image data returned from model");

    } catch (error) {
        console.error("Image Gen Error:", error);
        throw error;
    }
}

/**
 * Generates Speech (TTS) using Gemini
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");

        // Convert base64 to blob url
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Let's attach a simple WAV header for 24kHz mono PCM 16-bit
        const wavBlob = pcmToWav(bytes, 24000);
        return URL.createObjectURL(wavBlob);

    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
}

/**
 * Generates Video from Image using Veo (gemini-3-pro or veo-3.1).
 * NOW SUPPORTS CAMERA CONTROL INJECTION.
 */
export const generateVideoFromImage = async (
    prompt: string, 
    imageBase64Data: string, 
    aspectRatio: AspectRatio,
    cameraMovement: string = "Static"
): Promise<string> => {
    // 1. Mandatory API Key Check for Veo
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await aistudio.openSelectKey();
        }
    }

    try {
        const ai = getClient();
        const cleanBase64 = imageBase64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        console.log("Starting Veo Generation with Camera Move:", cameraMovement);

        // Enhance Prompt with Camera Directives
        // Veo responds well to "Cinematic [movement]" phrasing.
        const motionPrompt = `${prompt}. Cinematic camera movement: ${cameraMovement}. High quality, smooth motion.`;

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: motionPrompt, 
            image: {
                imageBytes: cleanBase64,
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p', 
                aspectRatio: aspectRatio
            }
        });

        console.log("Veo Operation started", operation);

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log("Polling Veo status...");
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        if (operation.error) {
            throw new Error(`Veo Generation Error: ${operation.error.message}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("No video URI returned from Veo");

        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) throw new Error("Failed to download generated video");
        
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error: any) {
        const win = window as any;
        if (error.message && error.message.includes("Requested entity was not found") && win.aistudio) {
             await win.aistudio.openSelectKey();
             throw new Error("API Key invalid or expired. Please re-select key and try again.");
        }
        console.error("Video Gen Error:", error);
        throw error;
    }
}


// Helper to wrap PCM in WAV container so <audio> tags can play it
function pcmToWav(pcmData: Uint8Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const pcmArray = new Uint8Array(buffer, 44);
    pcmArray.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}