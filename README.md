<p align="center">
  <a href="https://github.com/openvideodev/openvideo">
    <img width="150px" height="150px" src="https://cdn.scenify.io/openvideo-logo.png"/>
  </a>
</p>
<h1 align="center">Vue Video Editor</h1>

<div align="center">

**A high-performance video editing suite for the web, powered by [OpenVideo](https://openvideo.dev/).**

Built with Nuxt 4, Vue 3, WebCodecs, and PixiJS for professional-grade video rendering and processing directly in the browser.

<p align="center">
    <a href="https://openvideo.dev/">Website</a>
    ·  
    <a href="https://discord.gg/SCfMrQx8kr">Discord</a>
    ·  
    <a href="https://docs.openvideo.dev">Documentation</a>
</p>
</div>

[![](https://cdn.scenify.io/openvideo-editor.png)](https://github.com/openvideodev/openvideo)

## Overview

Vue Video Editor is a specialized implementation of the [OpenVideo](https://github.com/openvideodev/openvideo) engine, providing a rich, interactive UI for video composition, editing, and rendering. It leverages modern web technologies to deliver a desktop-class editing experience entirely within the browser.

## Features

- **🚀 High-Performance Rendering**: Powered by `openvideo`, utilizing WebCodecs and PixiJS for efficient hardware-accelerated processing.
- **🎞️ Multi-Track Timeline**: Professional timeline interface for managing video, audio, image, and text layers.
- **🎙️ AI Voiceovers & Captions**: Integrated with Deepgram and ElevenLabs for automated transcription and high-quality speech synthesis.
- **✨ Dynamic Effects & Transitions**: GLSL-powered effects (Chromakey, etc.) and smooth transitions between clips.
- **💾 JSON Project State**: Full serialization support for saving, sharing, and cloud-based rendering.
- **🎨 Customization**: Extensible architecture built with Nuxt 4, Vue 3, and Tailwind CSS.

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) / [Vue 3](https://vuejs.org/)
- **Engine**: [OpenVideo](https://openvideo.dev/) (WebCodecs + PixiJS)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/) (via Nuxt)
- **UI Components**: [Shadcn Vue](https://www.shadcn-vue.com/) / [Lucide Vue](https://lucide.dev/)
- **Utilities**: [VueUse](https://vueuse.org/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v10+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/openvideodev/vue-video-editor.git
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   Copy `.env.sample` to `.env` and fill in the required API keys (Colortv, Google Cloud, OpenAI, Deepgram, etc.).

### Development

Start the development server:
```bash
pnpm dev
```

The editor will be available at `http://localhost:3000`.

## Documentation

For detailed information on the underlying engine, visit the [OpenVideo Documentation](https://docs.openvideo.dev).

## License

This project is licensed under the [MIT License](LICENSE).