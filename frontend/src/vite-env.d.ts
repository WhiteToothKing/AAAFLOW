/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_DISABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  gameartDesktop?: {
    isDesktop: boolean;
    notifyGenerationDone: (title?: string, body?: string) => void;
    minimize: () => void;
    maximize: () => void;
    closeWindow: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChanged: (cb: (isMaximized: boolean) => void) => () => void;
  };
  aaaflowLauncher?: {
    getRepoRoot: () => Promise<{ ok: boolean; path?: string; message?: string }>;
    checkHealth: () => Promise<boolean>;
    tryOpenMain: () => Promise<{ ok: boolean }>;
    ensureEnv: () => Promise<{ ok: boolean; openedNotepad?: boolean }>;
    startDocker: () => void;
    openEnvFile: () => Promise<{ ok: boolean }>;
    openRepoFolder: () => Promise<{ ok: boolean }>;
    openMirrorHelp: () => Promise<{ ok: boolean }>;
    onDockerLog: (cb: (text: string) => void) => () => void;
    onDockerDone: (cb: (code: number) => void) => () => void;
  };
}
