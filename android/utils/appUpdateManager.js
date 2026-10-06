import { createAppUpdateService } from "./updateService.js";

const updateService = createAppUpdateService();
const listeners = new Set();
let state = {
  stage: "idle",
  status: "idle",
  progress: 0,
  version: "",
  manifest: null,
  error: ""
};

function publish(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

function createCallbacks() {
  return {
    onStage: ({ stage, version, manifest, error }) => {
      publish({
        stage,
        status: stage,
        ...(version ? { version } : {}),
        ...(manifest ? { manifest } : {}),
        ...(error ? { error } : {})
      });
    },
    onProgress: (progress) => publish({ stage: "downloading", status: "downloading", progress })
  };
}

function settle(result) {
  publish({
    stage: result.status,
    status: result.status,
    progress: result.status === "installed" ? 100 : state.progress,
    ...(result.version ? { version: result.version } : {}),
    ...(result.manifest ? { manifest: result.manifest } : {})
  });
  return result;
}

export function getUpdateState() {
  return { ...state };
}

export function subscribeUpdateState(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function runAutomaticUpdateCheck() {
  return updateService.check({ autoInstall: true, ...createCallbacks() }).then(settle);
}

export function checkForUpdate() {
  publish({ stage: "checking", status: "checking", progress: 0, error: "" });
  return updateService
    .check({ force: true, autoInstall: false, ...createCallbacks() })
    .then(settle);
}

export function installAvailableUpdate(manifest) {
  if (!manifest) {
    return Promise.resolve({ status: "invalid-manifest" });
  }
  publish({ stage: "installing", status: "installing", progress: 0, error: "" });
  return updateService.install(manifest, createCallbacks()).then(settle);
}
