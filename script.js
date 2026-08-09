(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;

  // The opening is intentionally brief: a brand reveal, not a loading screen.
  const loader = document.querySelector("#loader");
  const dismissLoader = () => loader?.classList.add("done");
  if (reducedMotion) {
    dismissLoader();
  } else {
    Promise.race([
      document.fonts?.ready || Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 1700))
    ]).then(() => setTimeout(dismissLoader, 950));
  }

  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".scroll-progress span");
  const heroOrbit = document.querySelector(".hero__orbit");

  const updatePagePosition = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageProgress = clamp(window.scrollY / max);
    progress.style.transform = `scaleX(${pageProgress})`;
    header.classList.toggle("scrolled", window.scrollY > 28);

    if (heroOrbit && !reducedMotion) {
      const heroShift = Math.min(window.scrollY, window.innerHeight) * 0.13;
      heroOrbit.style.setProperty("--hero-shift", `${heroShift}px`);
    }
  };
  updatePagePosition();
  window.addEventListener("scroll", updatePagePosition, { passive: true });

  // Slow exhibition-mode movement. Any real interaction wins immediately.
  const motionButton = document.querySelector("#motion-toggle");
  const motionLabel = motionButton?.querySelector(".motion-toggle__label");
  let autoScrollEnabled = !reducedMotion;
  let lastUserActivity = performance.now();
  let lastAutoFrame = performance.now();
  let autoScrollCarry = 0;

  const setAutoScroll = (enabled) => {
    autoScrollEnabled = enabled && !reducedMotion;
    motionButton?.setAttribute("aria-pressed", String(autoScrollEnabled));
    motionButton?.setAttribute("aria-label", autoScrollEnabled ? "Pause auto-scroll" : "Resume auto-scroll");
    if (motionLabel) motionLabel.textContent = autoScrollEnabled ? "Pause scroll" : "Auto scroll";
    lastUserActivity = performance.now();
  };

  const markUserActivity = () => {
    lastUserActivity = performance.now();
  };
  ["wheel", "touchstart", "touchmove", "pointerdown", "pointermove", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, markUserActivity, { passive: true });
  });
  document.addEventListener("visibilitychange", markUserActivity);

  motionButton?.addEventListener("click", () => setAutoScroll(!autoScrollEnabled));
  if (reducedMotion && motionButton) motionButton.hidden = true;

  const runAutoScroll = (now) => {
    const delta = Math.min(50, now - lastAutoFrame);
    lastAutoFrame = now;
    const idleLongEnough = now - lastUserActivity > 6500;
    const atEnd = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
    const userIsFocused = document.activeElement && /^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (autoScrollEnabled && idleLongEnough && !atEnd && !userIsFocused && !document.body.classList.contains("menu-open") && !document.hidden) {
      autoScrollCarry += delta * .016;
      const wholePixels = Math.floor(autoScrollCarry);
      if (wholePixels > 0) {
        window.scrollBy({ top: wholePixels, left: 0, behavior: "auto" });
        autoScrollCarry -= wholePixels;
      }
    } else if (!idleLongEnough || !autoScrollEnabled) {
      autoScrollCarry = 0;
    }
    requestAnimationFrame(runAutoScroll);
  };
  requestAnimationFrame(runAutoScroll);

  // Navigation
  const menuButton = document.querySelector("#menu-toggle");
  const navigation = document.querySelector("#site-nav");
  const closeMenu = () => {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
  };
  menuButton?.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    navigation.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
  });
  navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  // Sound starts only on an explicit click, as required by browser autoplay rules.
  const soundtrack = document.querySelector("#soundtrack");
  const soundButton = document.querySelector("#sound-toggle");
  const soundLabel = soundButton?.querySelector(".sound-toggle__label");
  soundtrack.volume = 0.34;

  soundButton?.addEventListener("click", async () => {
    const shouldPlay = soundButton.getAttribute("aria-pressed") !== "true";
    if (shouldPlay) {
      try {
        await soundtrack.play();
        soundButton.setAttribute("aria-pressed", "true");
        if (soundLabel) soundLabel.textContent = "Sound on";
      } catch {
        soundButton.setAttribute("aria-pressed", "false");
        if (soundLabel) soundLabel.textContent = "Audio unavailable";
      }
    } else {
      soundtrack.pause();
      soundButton.setAttribute("aria-pressed", "false");
      if (soundLabel) soundLabel.textContent = "Sound off";
    }
  });

  // Reveals use one observer and become static when reduced motion is requested.
  const revealItems = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -7%" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Project image changes are driven by the actual project copy in the viewport.
  const projectCopies = [...document.querySelectorAll(".project-copy")];
  const projectVisuals = [...document.querySelectorAll(".project-visual")];
  const activateProject = (name) => {
    projectCopies.forEach((copy) => copy.classList.toggle("active", copy.dataset.project === name));
    projectVisuals.forEach((visual) => visual.classList.toggle("active", visual.dataset.projectVisual === name));
  };
  if ("IntersectionObserver" in window) {
    const projectObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activateProject(visible.target.dataset.project);
    }, { threshold: [0.25, 0.45, 0.6] });
    projectCopies.forEach((copy) => projectObserver.observe(copy));
  }

  // Count only the verified figures supplied in the deck.
  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (element) => {
    const target = Number(element.dataset.count);
    const prefix = element.dataset.prefix || "";
    const suffix = element.dataset.suffix || "";
    const duration = reducedMotion ? 1 : 1150;
    const started = performance.now();
    const tick = (now) => {
      const t = clamp((now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      element.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.7 });
    counters.forEach((counter) => countObserver.observe(counter));
  } else {
    counters.forEach(animateCount);
  }

  // Lightweight cursor accent. It never replaces focus styling or touch input.
  const cursor = document.querySelector(".cursor");
  if (cursor && finePointer) {
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let targetX = cursorX;
    let targetY = cursorY;

    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
    }, { passive: true });

    document.querySelectorAll("a, button").forEach((element) => {
      element.addEventListener("pointerenter", () => cursor.classList.add("active"));
      element.addEventListener("pointerleave", () => cursor.classList.remove("active"));
    });

    const moveCursor = () => {
      cursorX = lerp(cursorX, targetX, .18);
      cursorY = lerp(cursorY, targetY, .18);
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(moveCursor);
    };
    if (!reducedMotion) moveCursor();
  }

  // One restrained ambient system: fine particles and a single solar orbit.
  const canvas = document.querySelector("#systems-canvas");
  const outputContext = canvas?.getContext("2d", { alpha: true });
  const sceneCanvas = document.createElement("canvas");
  const context = sceneCanvas.getContext("2d", { alpha: true });
  if (!canvas || !context || !outputContext) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointerX = .5;
  let pointerY = .5;
  let lensPointerX = .5;
  let lensPointerY = .5;
  let activeScene = "hero";
  let centerX = .62;
  let centerY = .43;
  let radius = 150;

  const scenes = {
    hero:        { x: .62, y: .43, r: 155, alpha: .36 },
    about:       { x: .82, y: .36, r: 105, alpha: .22 },
    projects:    { x: .28, y: .50, r: 125, alpha: .27 },
    field:       { x: .85, y: .50, r: 70,  alpha: .08 },
    apollyon:    { x: .79, y: .47, r: 95,  alpha: .2 },
    people:      { x: .16, y: .37, r: 80,  alpha: .16 },
    expeditions: { x: .78, y: .38, r: 100, alpha: .18 },
    contact:     { x: .78, y: .43, r: 145, alpha: .3 }
  };

  const particles = Array.from({ length: 74 }, (_, index) => ({
    x: (index * 0.61803398875) % 1,
    y: (index * 0.38196601125 + .17) % 1,
    size: .45 + (index % 5) * .23,
    depth: .2 + (index % 9) / 10,
    phase: index * .71
  }));

  const resizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    sceneCanvas.width = canvas.width;
    sceneCanvas.height = canvas.height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    outputContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX / Math.max(1, width);
    pointerY = event.clientY / Math.max(1, height);
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    const sceneObserver = new IntersectionObserver((entries) => {
      const dominant = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (dominant?.target.dataset.scene) activeScene = dominant.target.dataset.scene;
    }, { threshold: [.18, .35, .55] });
    document.querySelectorAll(".scene").forEach((scene) => sceneObserver.observe(scene));
  }

  const render = (time = 0) => {
    const target = scenes[activeScene] || scenes.hero;
    centerX = lerp(centerX, target.x, reducedMotion ? 1 : .025);
    centerY = lerp(centerY, target.y, reducedMotion ? 1 : .025);
    radius = lerp(radius, target.r, reducedMotion ? 1 : .025);

    context.clearRect(0, 0, width, height);
    const cx = centerX * width + (pointerX - .5) * 16;
    const cy = centerY * height + (pointerY - .5) * 12;

    // A near-invisible telemetry field gives the gravitational lens actual
    // geometry to bend everywhere, including otherwise empty dark regions.
    context.save();
    context.strokeStyle = "rgba(240,234,217,.025)";
    context.lineWidth = .65;
    const fieldStep = 14;
    const fieldOffsetX = ((pointerX - .5) * 10) % fieldStep;
    const fieldOffsetY = ((pointerY - .5) * 8) % fieldStep;
    context.beginPath();
    for (let x = fieldOffsetX; x < width; x += fieldStep) {
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    for (let y = fieldOffsetY; y < height; y += fieldStep) {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }
    context.stroke();
    context.restore();

    const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.6);
    glow.addColorStop(0, `rgba(246,189,50,${target.alpha * .22})`);
    glow.addColorStop(.28, `rgba(159,129,52,${target.alpha * .09})`);
    glow.addColorStop(1, "rgba(7,8,5,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(cx, cy);
    context.strokeStyle = `rgba(246,189,50,${target.alpha * .28})`;
    context.lineWidth = 1;
    [1, 1.62, 2.15].forEach((scale, index) => {
      context.beginPath();
      context.ellipse(0, 0, radius * scale, radius * scale * (.72 + index * .035), -.24, 0, Math.PI * 2);
      context.stroke();
    });
    context.restore();

    particles.forEach((particle) => {
      const drift = reducedMotion ? 0 : Math.sin(time * .00014 * particle.depth + particle.phase) * 8;
      const x = particle.x * width + (pointerX - .5) * particle.depth * 12 + drift;
      const y = particle.y * height + (pointerY - .5) * particle.depth * 9;
      context.fillStyle = `rgba(240,234,217,${.035 + particle.depth * .08})`;
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    outputContext.clearRect(0, 0, width, height);
    outputContext.drawImage(sceneCanvas, 0, 0, sceneCanvas.width, sceneCanvas.height, 0, 0, width, height);

    // Gravitational-lens approximation: concentric source sampling bends the
    // already-rendered background instead of placing a decorative circle on it.
    if (finePointer && !reducedMotion) {
      lensPointerX = lerp(lensPointerX, pointerX, .18);
      lensPointerY = lerp(lensPointerY, pointerY, .18);
      const lensX = lensPointerX * width;
      const lensY = lensPointerY * height;
      const lensRadius = 128;
      const steps = 28;

      for (let step = steps; step >= 1; step -= 1) {
        const ratio = step / steps;
        const ringRadius = lensRadius * ratio;
        const magnification = 1.04 + Math.pow(1 - ratio, 1.35) * 1.55;
        const sourceRadius = ringRadius / magnification;
        const sourceX = (lensX - sourceRadius) * dpr;
        const sourceY = (lensY - sourceRadius) * dpr;
        const sourceSize = sourceRadius * 2 * dpr;

        outputContext.save();
        outputContext.beginPath();
        outputContext.arc(lensX, lensY, ringRadius, 0, Math.PI * 2);
        outputContext.clip();
        outputContext.drawImage(
          sceneCanvas,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          lensX - ringRadius,
          lensY - ringRadius,
          ringRadius * 2,
          ringRadius * 2
        );
        outputContext.restore();
      }

      const core = outputContext.createRadialGradient(lensX, lensY, 0, lensX, lensY, 48);
      core.addColorStop(0, "rgba(0,0,0,.82)");
      core.addColorStop(.22, "rgba(7,8,5,.58)");
      core.addColorStop(.62, "rgba(246,189,50,.05)");
      core.addColorStop(1, "rgba(246,189,50,0)");
      outputContext.fillStyle = core;
      outputContext.beginPath();
      outputContext.arc(lensX, lensY, 48, 0, Math.PI * 2);
      outputContext.fill();
      outputContext.strokeStyle = "rgba(246,189,50,.52)";
      outputContext.lineWidth = 1;
      outputContext.beginPath();
      outputContext.arc(lensX, lensY, 31, 0, Math.PI * 2);
      outputContext.stroke();
    }

    if (!reducedMotion) requestAnimationFrame(render);
  };
  render();
})();
