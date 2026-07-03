/**
 * Studio store — projects + render queue, persisted to localStorage.
 *
 * History (undo/redo) is kept in-memory only. Persistence stays local-first;
 * swap the layer for Lovable Cloud later without touching engines or UI.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AudioSettings,
  ImageAsset,
  ImageMeta,
  Project,
  StoryArc,
  Timeline,
} from "./engines/types";

const HISTORY_LIMIT = 40;

type Snapshot = Pick<Project, "story" | "timeline" | "prompt" | "templateId" | "aspect" | "transitionDensity" | "audio" | "showTitle" | "name">;

interface StudioState {
  projects: Project[];
  currentId?: string;
  history: Record<string, { past: Snapshot[]; future: Snapshot[] }>;

  createProject: (input?: { name?: string; templateId?: string; prompt?: string }) => Project;
  deleteProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>, opts?: { skipHistory?: boolean }) => void;
  setAssets: (id: string, assets: ImageAsset[]) => void;
  setMeta: (id: string, meta: Record<string, ImageMeta>) => void;
  setMusic: (id: string, music: Project["music"]) => void;
  setStory: (id: string, story: StoryArc, opts?: { skipHistory?: boolean }) => void;
  setTimeline: (id: string, timeline: Timeline, opts?: { skipHistory?: boolean }) => void;
  setRender: (id: string, render: Partial<Project["render"]>) => void;
  setAudio: (id: string, audio: Partial<AudioSettings>) => void;
  getProject: (id: string) => Project | undefined;
  undo: (id: string) => void;
  redo: (id: string) => void;
  canUndo: (id: string) => boolean;
  canRedo: (id: string) => boolean;
}

const blankRender: Project["render"] = { status: "idle", progress: 0 };

const defaultAudio: AudioSettings = {
  volume: 0.9,
  muted: false,
  fadeIn: 0.6,
  fadeOut: 1.2,
  trimStart: 0,
};

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function snapshot(p: Project): Snapshot {
  return {
    story: p.story,
    timeline: p.timeline,
    prompt: p.prompt,
    templateId: p.templateId,
    aspect: p.aspect,
    transitionDensity: p.transitionDensity,
    audio: p.audio,
    showTitle: p.showTitle,
    name: p.name,
  };
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: [],
      history: {},

      createProject: ({ name, templateId, prompt } = {}) => {
        const p: Project = {
          id: rid(),
          name: name?.trim() || "Untitled Film",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          templateId: templateId ?? "a24-portrait",
          prompt: prompt ?? "",
          aspect: "16:9",
          transitionDensity: 0.5,
          audio: { ...defaultAudio },
          showTitle: false,
          assets: [],
          meta: {},
          render: { ...blankRender },
        };
        set((s) => ({
          projects: [p, ...s.projects],
          currentId: p.id,
          history: { ...s.history, [p.id]: { past: [], future: [] } },
        }));
        return p;
      },

      deleteProject: (id) =>
        set((s) => {
          const { [id]: _, ...restHist } = s.history;
          return {
            projects: s.projects.filter((p) => p.id !== id),
            history: restHist,
          };
        }),

      updateProject: (id, patch, opts) =>
        set((s) => {
          const proj = s.projects.find((p) => p.id === id);
          if (!proj) return s;
          const hist = pushHistory(s.history, id, proj, opts?.skipHistory);
          return {
            history: hist,
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
            ),
          };
        }),

      setAssets: (id, assets) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, assets, updatedAt: Date.now() } : p,
          ),
        })),

      setMeta: (id, meta) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, meta, updatedAt: Date.now() } : p,
          ),
        })),

      setMusic: (id, music) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, music, updatedAt: Date.now() } : p,
          ),
        })),

      setStory: (id, story, opts) =>
        set((s) => {
          const proj = s.projects.find((p) => p.id === id);
          if (!proj) return s;
          const hist = pushHistory(s.history, id, proj, opts?.skipHistory);
          return {
            history: hist,
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, story, updatedAt: Date.now() } : p,
            ),
          };
        }),

      setTimeline: (id, timeline, opts) =>
        set((s) => {
          const proj = s.projects.find((p) => p.id === id);
          if (!proj) return s;
          const hist = pushHistory(s.history, id, proj, opts?.skipHistory);
          return {
            history: hist,
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, timeline, updatedAt: Date.now() } : p,
            ),
          };
        }),

      setRender: (id, render) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, render: { ...p.render, ...render } } : p,
          ),
        })),

      setAudio: (id, audio) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, audio: { ...p.audio, ...audio }, updatedAt: Date.now() } : p,
          ),
        })),

      getProject: (id) => get().projects.find((p) => p.id === id),

      undo: (id) =>
        set((s) => {
          const h = s.history[id];
          const proj = s.projects.find((p) => p.id === id);
          if (!h || !proj || !h.past.length) return s;
          const prev = h.past[h.past.length - 1];
          return {
            history: {
              ...s.history,
              [id]: {
                past: h.past.slice(0, -1),
                future: [snapshot(proj), ...h.future].slice(0, HISTORY_LIMIT),
              },
            },
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, ...prev, updatedAt: Date.now() } : p,
            ),
          };
        }),

      redo: (id) =>
        set((s) => {
          const h = s.history[id];
          const proj = s.projects.find((p) => p.id === id);
          if (!h || !proj || !h.future.length) return s;
          const next = h.future[0];
          return {
            history: {
              ...s.history,
              [id]: {
                past: [...h.past, snapshot(proj)].slice(-HISTORY_LIMIT),
                future: h.future.slice(1),
              },
            },
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, ...next, updatedAt: Date.now() } : p,
            ),
          };
        }),

      canUndo: (id) => (get().history[id]?.past.length ?? 0) > 0,
      canRedo: (id) => (get().history[id]?.future.length ?? 0) > 0,
    }),
    {
      name: "studio.v2",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => ({
        // Strip heavy fields (image dataURLs, blob URLs, timelines) so we don't
        // blow past the ~5MB localStorage quota. Assets are re-added per session.
        projects: s.projects.map((p) => ({
          ...p,
          assets: [],
          meta: {},
          music: undefined,
          story: undefined,
          timeline: undefined,
          render: { status: "idle" as const, progress: 0 },
        })),
        currentId: s.currentId,
      }),
      // Backfill new fields for projects created in older versions.
      migrate: (state: unknown) => {
        const s = state as { projects?: Project[] };
        if (s?.projects) {
          s.projects = s.projects.map((p) => ({
            aspect: p.aspect ?? "16:9",
            transitionDensity: p.transitionDensity ?? 0.5,
            audio: p.audio ?? { ...defaultAudio },
            showTitle: p.showTitle ?? false,
            ...p,
          }));
        }
        return s as never;
      },
    },
  ),
);

function pushHistory(
  history: StudioState["history"],
  id: string,
  proj: Project,
  skip?: boolean,
): StudioState["history"] {
  if (skip) return history;
  const h = history[id] ?? { past: [], future: [] };
  return {
    ...history,
    [id]: {
      past: [...h.past, snapshot(proj)].slice(-HISTORY_LIMIT),
      future: [],
    },
  };
}
