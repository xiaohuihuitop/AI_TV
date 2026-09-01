import assert from "node:assert/strict";
import {
  createImmersivePlayerController,
  restoreStandardSystemUi
} from "../android/utils/immersivePlayer.js";

const calls = [];
const plusRuntime = {
  navigator: {
    setFullscreen: (value) => calls.push(["fullscreen", value]),
    hideSystemNavigation: () => calls.push(["navigation", "hide"]),
    showSystemNavigation: () => calls.push(["navigation", "show"])
  },
  screen: {
    lockOrientation: (value) => calls.push(["lock", value]),
    unlockOrientation: () => calls.push(["unlock"])
  }
};

const controller = createImmersivePlayerController(() => plusRuntime);
assert.equal(controller.enter("landscape-primary"), true);
assert.equal(controller.enter("landscape-primary"), true);
assert.equal(controller.finishEnter(false, false), false);
assert.equal(controller.finishEnter(true, false), false);
assert.equal(controller.finishEnter(true, true), true);
assert.equal(controller.enter("portrait-primary"), true);
assert.equal(controller.finishEnter(true, false), false);
assert.equal(controller.finishEnter(true, true), true);
assert.equal(controller.exit(), true);
assert.equal(controller.exit(), true);
assert.deepEqual(calls, [
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "landscape-primary"],
  ["fullscreen", true],
  ["navigation", "hide"],
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "portrait-primary"],
  ["fullscreen", true],
  ["navigation", "hide"],
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "portrait-primary"]
]);

const unavailable = createImmersivePlayerController(() => null);
assert.equal(unavailable.enter("portrait-primary"), false);
assert.equal(unavailable.finishEnter(true, true), false);
assert.equal(unavailable.exit(), false);

const restoreCalls = [];
assert.equal(
  restoreStandardSystemUi(() => ({
    navigator: {
      setFullscreen: (value) => restoreCalls.push(["fullscreen", value]),
      showSystemNavigation: () => restoreCalls.push(["navigation", "show"])
    },
    screen: {
      lockOrientation: (value) => restoreCalls.push(["lock", value])
    }
  })),
  true
);
assert.deepEqual(restoreCalls, [
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "portrait-primary"]
]);
assert.equal(restoreStandardSystemUi(() => null), false);

const partialCalls = [];
const partialFailure = createImmersivePlayerController(() => ({
  navigator: {
    setFullscreen: (value) => partialCalls.push(["fullscreen", value]),
    hideSystemNavigation: () => {
      partialCalls.push(["navigation", "hide"]);
      throw new Error("hide failed");
    },
    showSystemNavigation: () => partialCalls.push(["navigation", "show"])
  },
  screen: {
    lockOrientation: (value) => partialCalls.push(["lock", value])
  }
}));
assert.equal(partialFailure.enter("landscape-primary"), true);
assert.equal(partialFailure.finishEnter(true, false), false);
assert.equal(partialFailure.finishEnter(true, true), false);
assert.deepEqual(partialCalls, [
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "landscape-primary"],
  ["fullscreen", true],
  ["navigation", "hide"],
  ["fullscreen", false],
  ["navigation", "show"]
]);

const switchFailureCalls = [];
let orientationLocks = 0;
const switchFailure = createImmersivePlayerController(() => ({
  navigator: {
    setFullscreen: (value) => switchFailureCalls.push(["fullscreen", value]),
    hideSystemNavigation: () => switchFailureCalls.push(["navigation", "hide"]),
    showSystemNavigation: () => switchFailureCalls.push(["navigation", "show"])
  },
  screen: {
    lockOrientation: (value) => {
      orientationLocks += 1;
      switchFailureCalls.push(["lock", value]);
      if (orientationLocks === 2) {
        throw new Error("orientation switch failed");
      }
    }
  }
}));
assert.equal(switchFailure.enter("landscape-primary"), true);
assert.equal(switchFailure.finishEnter(true, false), false);
assert.equal(switchFailure.finishEnter(true, true), true);
assert.equal(switchFailure.enter("portrait-primary"), true);
assert.equal(switchFailure.finishEnter(true, false), true);
assert.deepEqual(switchFailureCalls, [
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "landscape-primary"],
  ["fullscreen", true],
  ["navigation", "hide"],
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "portrait-primary"],
  ["lock", "landscape-primary"],
  ["fullscreen", true],
  ["navigation", "hide"]
]);

const exitRetryCalls = [];
let showAttempts = 0;
const exitRetry = createImmersivePlayerController(() => ({
  navigator: {
    setFullscreen: (value) => exitRetryCalls.push(["fullscreen", value]),
    hideSystemNavigation: () => exitRetryCalls.push(["navigation", "hide"]),
    showSystemNavigation: () => {
      showAttempts += 1;
      exitRetryCalls.push(["navigation", "show"]);
      if (showAttempts === 2) {
        throw new Error("show failed once");
      }
    }
  },
  screen: {
    lockOrientation: (value) => exitRetryCalls.push(["lock", value])
  }
}));
assert.equal(exitRetry.enter("landscape-primary"), true);
assert.equal(exitRetry.finishEnter(true, false), false);
assert.equal(exitRetry.finishEnter(true, true), true);
assert.equal(exitRetry.exit(), false);
assert.equal(exitRetry.exit(), true);
assert.deepEqual(exitRetryCalls, [
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "landscape-primary"],
  ["fullscreen", true],
  ["navigation", "hide"],
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "portrait-primary"],
  ["fullscreen", false],
  ["navigation", "show"],
  ["lock", "portrait-primary"]
]);

const throwing = createImmersivePlayerController(() => ({
  navigator: {
    setFullscreen: () => {
      throw new Error("native failure");
    },
    hideSystemNavigation: () => {
      throw new Error("native failure");
    },
    showSystemNavigation: () => {
      throw new Error("native failure");
    }
  },
  screen: {
    lockOrientation: () => {
      throw new Error("native failure");
    },
    unlockOrientation: () => {
      throw new Error("native failure");
    }
  }
}));
assert.equal(throwing.enter("portrait-primary"), false);
assert.equal(throwing.exit(), false);

console.log("android immersive player tests passed");
