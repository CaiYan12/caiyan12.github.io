(() => {
    const windows = Array.from(document.querySelectorAll(".cmd"));
    const commandBox = document.getElementById("cmdBox");
    const activeStateAnimations = new WeakMap();
    const stateTransitionDuration = 220;

    if (!windows.length) return;

    const getRect = (windowElement) => {
        const rect = windowElement.getBoundingClientRect();

        return {
            height: rect.height,
            width: rect.width,
            x: rect.left,
            y: rect.top,
        };
    };

    const updateLayoutState = () => {
        const firstWindowState = windows[0]?.dataset.windowState;

        commandBox?.classList.toggle(
            "has-minimized-first",
            firstWindowState === "minimized",
        );
        commandBox?.classList.toggle(
            "has-maximized-first",
            firstWindowState === "maximized",
        );
    };

    const updateMinimizedPositions = () => {
        const minimizedWindows = windows.filter((windowElement) =>
            windowElement.classList.contains("is-minimized"),
        );

        windows.forEach((windowElement) => {
            const minimizedIndex = minimizedWindows.indexOf(windowElement);

            if (minimizedIndex === -1) {
                windowElement.style.removeProperty("--minimized-offset");
                return;
            }

            windowElement.style.setProperty(
                "--minimized-offset",
                `${16 + minimizedIndex * 35}px`,
            );
        });
    };

    const stopStateAnimation = (windowElement) => {
        activeStateAnimations.get(windowElement)?.();
    };

    const updatePageState = () => {
        document.body.classList.toggle(
            "domain-window-maximized",
            windows.some((windowElement) =>
                windowElement.classList.contains("is-maximized"),
            ),
        );
    };

    const updateControlLabels = (windowElement, state) => {
        const maximizeButton = windowElement.querySelector(
            '[data-window-action="maximize"]',
        );
        const minimizeButton = windowElement.querySelector(
            '[data-window-action="minimize"]',
        );

        if (maximizeButton) {
            const label = state === "maximized" ? "Restore window" : "Maximize window";
            maximizeButton.setAttribute("aria-label", label);
            maximizeButton.title = label;
        }

        if (minimizeButton) {
            const label = state === "minimized" ? "Restore window" : "Minimize window";
            minimizeButton.setAttribute("aria-label", label);
            minimizeButton.title = label;
        }
    };

    const setWindowState = (windowElement, state) => {
        windowElement.classList.toggle("is-maximized", state === "maximized");
        windowElement.classList.toggle("is-minimized", state === "minimized");
        windowElement.dataset.windowState = state;
        updateControlLabels(windowElement, state);
        updateLayoutState();
        updateMinimizedPositions();
        updatePageState();
    };

    const animateStateChange = (windowElement, state) => {
        const first = getRect(windowElement);

        stopStateAnimation(windowElement);
        setWindowState(windowElement, state);

        const last = getRect(windowElement);

        if (!first.width || !first.height || !last.width || !last.height) {
            return;
        }

        const scaleX = first.width / last.width;
        const scaleY = first.height / last.height;
        const translateX = first.x - last.x;
        const translateY = first.y - last.y;

        let cleanupTimer = 0;

        const cleanup = () => {
            window.clearTimeout(cleanupTimer);
            windowElement.removeEventListener("transitionend", handleTransitionEnd);
            activeStateAnimations.delete(windowElement);
            windowElement.classList.remove("is-state-changing");
            windowElement.style.removeProperty("transform");
            windowElement.style.removeProperty("transform-origin");
            windowElement.style.removeProperty("will-change");
        };

        const handleTransitionEnd = (event) => {
            if (event.propertyName === "transform") {
                cleanup();
            }
        };

        activeStateAnimations.set(windowElement, cleanup);
        windowElement.style.transformOrigin = "top left";
        windowElement.style.willChange = "transform";
        windowElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
        windowElement.getBoundingClientRect();
        windowElement.classList.add("is-state-changing");
        windowElement.addEventListener("transitionend", handleTransitionEnd);
        cleanupTimer = window.setTimeout(cleanup, stateTransitionDuration + 60);

        window.requestAnimationFrame(() => {
            if (activeStateAnimations.get(windowElement) === cleanup) {
                windowElement.style.transform = "none";
            }
        });
    };

    const handleAction = (windowElement, action) => {
        const currentState = windowElement.dataset.windowState || "normal";

        if (action === "close") {
            window.location.href = "/";
            return;
        }

        if (action === "maximize") {
            animateStateChange(
                windowElement,
                currentState === "maximized" ? "normal" : "maximized",
            );
        }

        if (action === "minimize") {
            animateStateChange(
                windowElement,
                currentState === "minimized" ? "normal" : "minimized",
            );
        }
    };

    windows.forEach((windowElement) => {
        setWindowState(windowElement, "normal");

        windowElement
            .querySelectorAll("button[data-window-action]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    handleAction(windowElement, button.dataset.windowAction);
                });
            });
    });
})();
