# GraphLM Frontend

The frontend for **GraphLM** is a modern, responsive, and dynamic React application that provides users with a seamless interface to interact with their documents and GitHub repositories through a powerful AI assistant.

This application is built with speed and user experience in mind, featuring real-time Server-Sent Events (SSE) for both document indexing status and streaming AI chat responses.

---

## 📸 Screenshots

<!-- Uncomment and add image paths once screenshots are available -->
<!--
### Dashboard
![Dashboard showing attached sources and recent chat sessions](./public/screenshots/dashboard.png)

### Chat Interface
![Chat interface with streaming markdown responses](./public/screenshots/chat.png)

### Knowledge Graph Studio
![Interactive vis-network knowledge graph visualisation](./public/screenshots/graph-studio.png)

### Source Upload
![Drag and drop source upload modal](./public/screenshots/upload-modal.png)
-->

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS v4 (using CSS variables for token-driven theming)
- **State Management**: Zustand 5 (Modular stores for Auth, Chat, Sources, and Theme)
- **Routing**: React Router 7
- **Graph Visualization**: `vis-network` & `vis-data`
- **Markdown Rendering**: `react-markdown` + `remark-gfm`
- **Notifications**: `sonner`
- **HTTP Client**: `axios`

---

## 🌟 Key Features

1. **Token-Driven Theming**: Full support for Light, Dark, and System themes using native Tailwind v4 CSS variables.
2. **Real-Time Streaming**: Live streaming of AI responses and tool executions via custom Server-Sent Events (SSE) parsing.
3. **Interactive Graph Canvas**: A dedicated "Studio" panel that renders dynamic `vis-network` knowledge graphs extracted from your documents, updating live as you chat in subgraph mode.
4. **Source Management**: Drag-and-drop file uploads (PDF, DOCX, TXT, MD) and GitHub repository linking with live indexing progress indicators.
5. **Responsive Panels**: Resizable and collapsible sidebars for managing chat history and attached sources efficiently.

---

## 📂 Project Structure

```
src/
├── api/              # Axios service wrappers (auth, chat, sources)
├── assets/           # Static assets, SVG icons, and illustrations
├── Components/       # Reusable UI components
│   ├── Auth/         # Login, Register, Password Reset forms
│   ├── Chat/         # Chat layout, Message rendering, Studio panel, GraphView
│   ├── Common/       # Shared UI primitives (Buttons, Modals, Logo)
│   └── Layout/       # Header, Sidebar, Footer components
├── pages/            # Top-level page components (Landing, Dashboard, AuthPage)
├── routes/           # React Router configurations and protected routes
├── store/            # Zustand state management (authStore, chatStore, etc.)
└── utils/            # Helper functions, SSE parsers, date formatters
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure Environment Variables (if any are required by your Vite setup):
```bash
cp .env.example .env
```

### Running the Development Server

Start the Vite development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🎨 Styling Guidelines

This project utilizes **Tailwind CSS v4** with a strict token-driven design system. 
All colors are defined in `src/index.css` as CSS variables (e.g., `--bg-base`, `--text-primary`, `--accent-cyan`). 

When adding new components, **do not hardcode hex colors**. Always use the provided Tailwind bracket syntax mapping to the CSS variables:
```jsx
// Correct
<div className="bg-(--bg-surface) text-(--text-primary)">...</div>

// Incorrect
<div className="bg-gray-800 text-white">...</div>
```

## 🔗 Backend Integration
The frontend expects the FastAPI backend to be running on `http://localhost:4000` by default. Ensure the backend and databases (PostgreSQL, Qdrant, Neo4j) are up and running for full functionality.
