# 🚀 AniFlow Studio - 自动化专业漫剧生成引擎

<div align="center">
  <h3>The Future of Agentic Animation Pipelines</h3>
  <p>
    基于 <strong>Google Gemini 3.0 & Veo</strong> 的全流程 AI 导演代理。<br/>
    一键生成分镜、保持角色一致性、精准控制人物演技。
  </p>
</div>

---

## 📖 项目简介 (Introduction)

**AniFlow Studio** 是一个实验性的 **AI 导演代理（Agentic Director）** 系统。

传统的 AI 视频生成工具通常只是“抽卡”——你输入提示词，然后祈祷好运。AniFlow 改变了这一流程。它像一个真实的人类导演团队：
1.  **编剧 (Scriptwriter)**：Gemini 3.0 负责构思剧情，并将其拆解为专业的电影分镜（镜头、景别、运镜）。
2.  **美术指导 (Art Director)**：通过“视觉锚定”技术，先确立角色和场景标准，再生成分镜，解决 AI 视频的一致性问题。
3.  **摄影与表演 (Cinematography & Acting)**：**[NEW]** 能够精确控制角色的面部表情（哭泣、大笑、惊恐）和镜头运动（推拉摇移），拒绝“AI 面瘫”。

---

## ✨ 核心特性 (Key Features)

### 1. 🎭 动态演技引擎 (Dynamic Acting Engine) `NEW`
- **拒绝“AI 面瘫”**：引入独立的 `character_emotion` 控制通道。后端 Prompt 逻辑经过特殊优化，强制 AI 在**“锁住长相（Face ID）”**的同时，**“解锁表情”**。
- **精准情绪控制**：支持为每一个分镜单独指定情绪（如：*Terrified scream*, *Smug grin*, *Tears in eyes*），让角色真正活起来。

### 2. 🧠 智能导演系统 (Agentic Workflow)
- **专业分镜拆解**：输入一句话（如“赛博朋克少女逃亡”），AI 自动生成包含**景别 (Shot Size)**、**运镜 (Camera Move)** 和 **音效 (SFX)** 的完整脚本。
- **镜头语言注入**：系统内置电影理论知识库，懂得何时使用 *Dutch Angle* 制造紧张感，何时使用 *Close-up* 展现细节。

### 3. 🎨 极致的一致性 (Visual Consistency)
- **三明治提示词架构**：采用 `[全局风格] + [角色锚定图] + [当前动作/表情] + [环境锚定]` 的结构化 Prompt，确保角色换了动作也不换脸，背景切了镜头也不乱跳。

### 4. 🎥 Veo 视频与多模态合成
- **Veo 动态生成**：无缝集成 Google Veo 模型，将静态分镜转化为高质量视频。
- **全流程合成**：自动生成 TTS 语音（Gemini Audio）、匹配背景音乐（BGM）和音效，并在非线性编辑（NLE）时间轴上实时预览。

---

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: React 18, TypeScript, Tailwind CSS (Glassmorphism UI)
- **AI Models**: 
  - **Reasoning**: `gemini-3-flash-preview` (Logic & Scripting)
  - **Vision**: `gemini-2.5-flash-image` (Character & Storyboard)
  - **Video**: `veo-3.1-fast-generate-preview` (Motion Generation)
  - **Audio**: `gemini-2.5-flash-preview-tts` (Speech Synthesis)
- **State Management**: React Hooks + Custom Timeline Logic

---

## 🚀 快速开始 (Quick Start)

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/aniflow-studio.git
   cd aniflow-studio
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置 API Key**
   本项目依赖 Google GenAI SDK。
   - 在代码中配置 `process.env.API_KEY`，或在网页首次运行时通过 Veo 授权弹窗输入 Key。
   - *注意：使用 Veo 视频生成功能需要付费的 Google Cloud 项目权限。*

4. **启动开发服务器**
   ```bash
   npm start
   ```

---

## 📸 工作流演示 (Workflow)

1.  **Idea Input**: 输入你的创意（例如：“雨夜，武士拔刀”）。
2.  **Cast Design**: AI 生成角色立绘，你满意后“锁定”角色。
3.  **Storyboard Generation**: AI 生成 5 个关键分镜。
4.  **Director's Revision**: 
    - 觉得表情不够生动？在检查器中修改 `Emotion` 为 "Angry screaming"。
    - 觉得镜头太死板？修改 `Camera` 为 "Zoom In"。
    - 点击 **"Re-Roll Visual"**。
5.  **Export**: 一键渲染成片。

---

## 🤝 贡献 (Contribution)

AniFlow 仍处于早期实验阶段。欢迎提交 PR 改进以下方向：
- 引入 WebCodecs 实现前端视频的真实合成导出（目前为序列帧模拟）。
- 增加更多的角色 LoRA 或风格预设。
- 优化长视频的记忆上下文窗口。

---

## 📄 License

MIT License