const SUPPORTED_ORIENTATIONS = new Set([
  "landscape-primary",
  "portrait-primary"
]);

/**
 * Restore the standard portrait app window before a player WebView is created.
 * @param {() => Object|null} getRuntime Resolve the current HTML5+ runtime.
 * @returns {boolean} Whether every native operation succeeded.
 */
export function restoreStandardSystemUi(getRuntime) {
  let runtime = null;
  try {
    runtime = typeof getRuntime === "function" ? getRuntime() : null;
  } catch (error) {
    return false;
  }
  if (
    !runtime ||
    !runtime.navigator ||
    typeof runtime.navigator.setFullscreen !== "function" ||
    typeof runtime.navigator.showSystemNavigation !== "function" ||
    !runtime.screen ||
    typeof runtime.screen.lockOrientation !== "function"
  ) {
    return false;
  }

  let succeeded = true;
  try {
    runtime.navigator.setFullscreen(false);
  } catch (error) {
    succeeded = false;
  }
  try {
    runtime.navigator.showSystemNavigation();
  } catch (error) {
    succeeded = false;
  }
  try {
    runtime.screen.lockOrientation("portrait-primary");
  } catch (error) {
    succeeded = false;
  }
  return succeeded;
}

/**
 * Create an idempotent adapter for the HTML5+ immersive-screen APIs.
 * @param {() => Object|null} getRuntime Resolve the current HTML5+ runtime.
 * @returns {{enter: function(string): boolean, finishEnter: function(boolean, boolean): boolean, exit: function(): boolean}} Controller.
 */
export function createImmersivePlayerController(getRuntime) {
  let active = false;
  let currentOrientation = "";
  let targetOrientation = "";
  let hasEnteredSuccessfully = false;
  let systemUiHidden = false;
  let phase = "idle";

  function resolveRuntime() {
    try {
      return typeof getRuntime === "function" ? getRuntime() : null;
    } catch (error) {
      return null;
    }
  }

  return {
    enter(orientation) {
      if (!SUPPORTED_ORIENTATIONS.has(orientation)) {
        return false;
      }
      const runtime = resolveRuntime();
      if (
        !runtime ||
        !runtime.navigator ||
        typeof runtime.navigator.setFullscreen !== "function" ||
        typeof runtime.navigator.hideSystemNavigation !== "function" ||
        typeof runtime.navigator.showSystemNavigation !== "function" ||
        !runtime.screen ||
        typeof runtime.screen.lockOrientation !== "function"
      ) {
        return false;
      }
      if (active && targetOrientation === orientation) {
        return true;
      }

      const wasActive = active;
      const previousOrientation = currentOrientation;
      try {
        runtime.navigator.setFullscreen(false);
        runtime.navigator.showSystemNavigation();
        systemUiHidden = false;
        active = true;
        targetOrientation = orientation;
        phase = "revealing";
        hasEnteredSuccessfully = true;
        return true;
      } catch (error) {
        if (wasActive && previousOrientation) {
          try {
            runtime.navigator.setFullscreen(true);
            runtime.navigator.hideSystemNavigation();
            systemUiHidden = true;
            active = true;
            currentOrientation = previousOrientation;
            targetOrientation = previousOrientation;
            phase = "active";
            return true;
          } catch (restoreError) {
            return false;
          }
        }
        try {
          runtime.screen.lockOrientation("portrait-primary");
          runtime.navigator.setFullscreen(false);
          runtime.navigator.showSystemNavigation();
        } catch (restoreError) {
          // A later lifecycle cleanup can retry native restoration.
        }
        active = false;
        currentOrientation = "";
        targetOrientation = "";
        systemUiHidden = false;
        phase = "idle";
        return false;
      }
    },

    finishEnter(viewportReady, orientationReady) {
      if (!active) {
        return false;
      }
      if (phase === "active" && systemUiHidden) {
        return true;
      }
      const runtime = resolveRuntime();
      if (
        !runtime ||
        !runtime.navigator ||
        typeof runtime.navigator.setFullscreen !== "function" ||
        typeof runtime.navigator.hideSystemNavigation !== "function" ||
        typeof runtime.navigator.showSystemNavigation !== "function" ||
        !runtime.screen ||
        typeof runtime.screen.lockOrientation !== "function"
      ) {
        return false;
      }

      if (phase === "revealing") {
        if (!viewportReady) {
          return false;
        }
        const previousOrientation = currentOrientation;
        try {
          runtime.screen.lockOrientation(targetOrientation);
          currentOrientation = targetOrientation;
          phase = "rotating";
        } catch (error) {
          if (previousOrientation) {
            try {
              runtime.screen.lockOrientation(previousOrientation);
              runtime.navigator.setFullscreen(true);
              runtime.navigator.hideSystemNavigation();
              currentOrientation = previousOrientation;
              targetOrientation = previousOrientation;
              systemUiHidden = true;
              phase = "active";
              return true;
            } catch (restoreError) {
              return false;
            }
          }
          return false;
        }
      }
      if (!orientationReady) {
        return false;
      }

      try {
        runtime.navigator.setFullscreen(true);
        runtime.navigator.hideSystemNavigation();
        systemUiHidden = true;
        phase = "active";
        return true;
      } catch (error) {
        try {
          runtime.navigator.setFullscreen(false);
        } catch (restoreError) {
          // Keep trying the remaining native restoration operation.
        }
        try {
          runtime.navigator.showSystemNavigation();
        } catch (restoreError) {
          // A later resize or lifecycle cleanup can retry.
        }
        systemUiHidden = false;
        phase = "rotating";
        return false;
      }
    },

    exit() {
      if (!active) {
        return hasEnteredSuccessfully;
      }
      const runtime = resolveRuntime();
      if (
        !runtime ||
        !runtime.navigator ||
        typeof runtime.navigator.setFullscreen !== "function" ||
        typeof runtime.navigator.showSystemNavigation !== "function" ||
        !runtime.screen ||
        typeof runtime.screen.lockOrientation !== "function"
      ) {
        return false;
      }

      let succeeded = true;
      try {
        runtime.navigator.setFullscreen(false);
      } catch (error) {
        succeeded = false;
      }
      try {
        runtime.navigator.showSystemNavigation();
      } catch (error) {
        succeeded = false;
      }
      try {
        runtime.screen.lockOrientation("portrait-primary");
      } catch (error) {
        succeeded = false;
      }
      if (succeeded) {
        active = false;
        currentOrientation = "";
        targetOrientation = "";
        systemUiHidden = false;
        phase = "idle";
      }
      return succeeded;
    }
  };
}
