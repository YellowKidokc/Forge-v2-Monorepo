FORGE AI CODE — HANDOFF FOR KIMI
==================================
Source: D:\GitHub\Forge-v1-Claude

FILES INCLUDED:
  ai.ts (543 lines) — Multi-provider AI service
    - Anthropic (Claude Sonnet 4), OpenAI (GPT-4.1), Ollama (local)
    - Streaming responses
    - Three AI roles: Interface (execute tasks), Logic (validate structure), Copilot (predict next steps)
    - API key management in localStorage
    - System prompts per role

  AIWorkspace.tsx (477 lines) — Full chat UI
    - Multi-pane layout (1-4 columns)
    - Context modes: workspace, note, private
    - Chat history
    - Left rail: chats, agents, prompts, plugins, models, knowledge base, settings

  Kimi_Dashboard_Reference/ — Kimi's working dashboard (from earlier build)
    - Sidebar (22KB), center content (17KB), axioms data (23KB)
    - Charts, calendar, context panel
    - USE THIS AS THE STARTING POINT

NOTES FOR KIMI:
  1. ai.ts is production-quality — use it directly
  2. AIWorkspace.tsx works as-is for the chat UI
  3. If building for web (not desktop), swap Tauri APIs for browser APIs
  4. For Cloudflare deployment: Vite builds to static -> Cloudflare Pages, AI proxy through Cloudflare Workers
  5. The Kimi_Dashboard_Reference has a working dashboard she already built — use that as the starting point
  6. Wire the AI code into the new sidebar layout from the spec

— David Lowe / Claude Code, 2026-03-21
