/**
 * Studio store — projects + render queue, persisted to localStorage.
 *
 * Persistence is intentionally local-first. Swap the persistence layer for
 * Lovable Cloud later without touching the engines or UI.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ImageAsset, ImageMeta, Project, StoryArc, Timeline } from "./engines/types";

interface StudioState {
  projects: Project[];
  currentId?: string;

  createProject: (input: { name?: string; templateId?: string; prompt?: string }) => Project;
  deleteProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  setAssets: (id: string, assets: ImageAsset[]) => void;
  setMeta: (id: string, meta: Record<string, ImageMeta>) => void;
  setMusic: (id: string, music: Project["music"]) => void;
  setStory: (id: string, story: StoryArc) => void;
  setTimeline: (id: string, timeline: Timeline) => void;
  setRender: (id: string, render: Partial<Project["render"]>) => void;
  getProject: (id: string) => Project | undefined;
}

const blankRender: Project["render"] = { status: "idle", progress: 0 };

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: [],
      createProject: ({ name, templateId, prompt } = {}) => {
        const p: Project = {
          id: rid(),
          name: name?.trim() || "Untitled Film",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          templateId: templateId ?? "a24-portrait",
          prompt: prompt ?? "",
          assets: [],
          meta: {},
          render: { ...blankRender },
        };
        set((s) => ({ projects: [p, ...s.projects], currentId: p.id }));
        return p;
      },
      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        })),
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
      setStory: (id, story) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, story, updatedAt: Date.now() } : p,
          ),
        })),
      setTimeline: (id, timeline) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, timeline, updatedAt: Date.now() } : p,
          ),
        })),
      setRender: (id, render) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, render: { ...p.render, ...render } } : p,
          ),
        })),
      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    {
      name: "studio.v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => ({ projects: s.projects, currentId: s.currentId }),
    },
  ),
);
