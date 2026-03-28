import React, { useEffect, useMemo, useRef, useState } from "react";

const defaultCategoryMeta = {
  Accounting: {
    label: "Accounting",
    eyebrow: "Numbers & Control",
    description: "Ledger accuracy, billing discipline, and dependable financial workflow support.",
    glyph: "01",
  },
  "Digital Marketing": {
    label: "Digital Marketing",
    eyebrow: "Reach & Growth",
    description: "Practical campaign thinking for Meta Ads, visibility, and SEO-oriented content structure.",
    glyph: "02",
  },
  Technical: {
    label: "Technical",
    eyebrow: "Build & Improve",
    description: "Responsive websites, productivity systems, and AI-assisted execution for faster outcomes.",
    glyph: "03",
  },
};

const defaultAchievementLabels = {
  award: "Award",
  certificate: "Certified",
  star: "Recognized",
  bolt: "Fast Learner",
};

const speedMap = {
  slow: 1.25,
  medium: 1,
  fast: 0.78,
};

const autoplayMap = {
  slow: 5200,
  medium: 4200,
  fast: 3000,
};

const intensityMap = {
  low: 0.82,
  high: 1.16,
};

const glowIntensityMap = {
  low: 0.76,
  medium: 1,
  high: 1.24,
};

function stripHtml(html) {
  return (html || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function useCountUp(target, enabled) {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return undefined;
    }

    let frameId;
    const start = performance.now();
    const duration = 1200;

    function animate(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [enabled, target]);

  return value;
}

function triggerRipple(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;

  const existing = target.querySelector(".ui-ripple");
  if (existing) existing.remove();

  const rect = target.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height) * 1.25;

  ripple.className = "ui-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

  target.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 650);
}

function AnimatedText({ text, mode = "chars", className = "" }) {
  const tokens = mode === "words" ? text.split(" ") : Array.from(text);

  return (
    <span className={`animated-text ${className}`}>
      {tokens.map((token, index) => {
        const content =
          mode === "words"
            ? `${token}${index < tokens.length - 1 ? "\u00A0" : ""}`
            : token === " "
              ? "\u00A0"
              : token;

        return (
          <span key={`${token}-${index}`} className="animated-text-unit" style={{ "--unit-index": index }}>
            {content}
          </span>
        );
      })}
    </span>
  );
}

function StatCounter({ label, value, suffix, enabled }) {
  const display = useCountUp(value, enabled);

  return (
    <article className="stat-card">
      <strong>
        {display}
        {suffix}
      </strong>
      <span>{label}</span>
    </article>
  );
}

function ProjectSlide({ slide, onRipple }) {
  if (slide.type === "capability") {
    return (
      <article className="story-slide-card story-slide-card-support">
        <div className="story-slide-frame story-slide-frame-support" data-parallax-speed="0.16">
          <span className="story-slide-eyebrow">{slide.eyebrow}</span>
          <strong>{slide.title}</strong>
          <p>{slide.description}</p>
          <div className="tag-row">
            {slide.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="story-slide-card">
      <div className="story-slide-media" data-parallax-speed="0.18">
        {slide.image ? <img src={slide.image} alt={slide.title} className="story-slide-image" loading="lazy" /> : null}
      </div>
        <div className="story-slide-copy">
        <span className="story-slide-eyebrow">{slide.eyebrow || "Project Spotlight"}</span>
        <strong>{slide.title}</strong>
        <p>{slide.description}</p>
        <div className="tag-row">
          {slide.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {slide.liveLink ? (
          <a className="primary-button portfolio-button" href={slide.liveLink} target="_blank" rel="noreferrer" onPointerDown={onRipple}>
            View Project
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default function PortfolioView({ data, preview = false }) {
  const frameRef = useRef(null);
  const sliderViewportRef = useRef(null);
  const pointerStateRef = useRef({ active: false, startX: 0, deltaX: 0 });

  const [activeSection, setActiveSection] = useState("hero");
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const siteConfig = data?.siteConfig || {};
  const sectionConfig = data?.sections || {};
  const categoryMeta = siteConfig.skillCategoryMeta || defaultCategoryMeta;
  const achievementLabels = siteConfig.achievementIconLabels || defaultAchievementLabels;
  const showTopbarBrand = siteConfig.showBrand === true;

  const groupedSkills = useMemo(() => {
    if (!data?.skills) return [];

    const grouped = data.skills.reduce((acc, skill) => {
      acc[skill.category] = acc[skill.category] || [];
      acc[skill.category].push(skill);
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, items], index) => ({
      category,
      id: slugify(category || `category-${index + 1}`),
      items,
      average: Math.round(items.reduce((sum, skill) => sum + Number(skill.level || 0), 0) / Math.max(items.length, 1)),
      ...(categoryMeta[category] || {}),
    }));
  }, [data, categoryMeta]);

  const featuredProject = useMemo(() => {
    if (!data?.projects?.length) return null;
    return data.projects.find((project) => project.featured) || data.projects[0];
  }, [data]);

  const projectSidePanels = useMemo(() => {
    return groupedSkills
      .slice()
      .sort((left, right) => right.average - left.average)
      .slice(0, 2);
  }, [groupedSkills]);

  const storySlides = useMemo(() => {
    const projectSlides = (data?.projects || []).map((project) => ({
      type: "project",
      id: project.id,
      title: project.title,
      description: project.description,
      image: project.image,
      liveLink: project.liveLink,
      tags: project.tags || [],
      eyebrow: sectionConfig.projects?.projectEyebrow || "Project Spotlight",
    }));

    const supportSlides = groupedSkills.slice(0, 3).map((group) => ({
      type: "capability",
      id: `${group.id}-support`,
      title: group.label || group.category,
      eyebrow: group.eyebrow || "Capability",
      description: group.description || "Practical strengths presented through measurable skill depth.",
      tags: group.items.slice(0, 3).map((item) => item.name),
    }));

    return [...projectSlides, ...supportSlides].slice(0, Math.max(3, projectSlides.length || 0));
  }, [data, groupedSkills, sectionConfig.projects?.projectEyebrow]);

  const statTargets = useMemo(
    () => [
      { label: "Years Building Skills", value: Math.max(data?.experiences?.length || 0, 2), suffix: "+" },
      { label: "Projects & Real Work", value: Math.max(data?.projects?.length || 0, 1), suffix: "+" },
      { label: "Core Skills", value: data?.skills?.length || 0, suffix: "+" },
      { label: "Achievements", value: data?.achievements?.length || 0, suffix: "" },
    ],
    [data],
  );

  const motionEnabled = data?.theme?.animationsEnabled !== false;
  const introAnimationEnabled = motionEnabled && data?.theme?.introAnimationEnabled !== false;
  const scrollAnimationsEnabled = motionEnabled && data?.theme?.scrollAnimationsEnabled !== false;
  const parallaxEnabled = motionEnabled && data?.theme?.parallaxEnabled !== false;
  const glowEnabled = motionEnabled && data?.theme?.glowEnabled !== false;
  const backgroundEffectsEnabled = motionEnabled && data?.theme?.backgroundEffectsEnabled !== false;
  const imageZoomEnabled = introAnimationEnabled && data?.theme?.imageZoomEnabled !== false;
  const speedFactor = speedMap[data?.theme?.animationSpeed] || 1;
  const autoplayDelay = autoplayMap[data?.theme?.animationSpeed] || 4200;
  const intensityFactor = intensityMap[data?.theme?.animationIntensity] || 1;
  const glowFactor = glowIntensityMap[data?.theme?.glowIntensity] || 1;

  useEffect(() => {
    if (preview || !introAnimationEnabled) {
      setHeroReady(true);
      return undefined;
    }

    setHeroReady(false);
    const timeoutId = window.setTimeout(() => setHeroReady(true), 120);
    return () => window.clearTimeout(timeoutId);
  }, [preview, introAnimationEnabled, data?.profile?.name, data?.profile?.headline, data?.profile?.image]);

  useEffect(() => {
    if (!frameRef.current) return undefined;

    const root = frameRef.current;
    const revealTargets = Array.from(root.querySelectorAll("[data-reveal]"));
    const sections = Array.from(root.querySelectorAll("[data-section-id]"));

    if (preview || !scrollAnimationsEnabled) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" },
    );

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target?.dataset?.sectionId) {
          setActiveSection(visible.target.dataset.sectionId);
        }
      },
      { threshold: 0.35, rootMargin: "-20% 0px -45% 0px" },
    );

    if (!preview && scrollAnimationsEnabled) {
      revealTargets.forEach((target) => revealObserver.observe(target));
    }
    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, [preview, scrollAnimationsEnabled, data]);

  useEffect(() => {
    if (preview) return undefined;

    function handleResize() {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [preview]);

  useEffect(() => {
    setCurrentSlide((current) => Math.max(0, Math.min(current, Math.max(storySlides.length - 1, 0))));
  }, [storySlides.length]);

  useEffect(() => {
    if (preview || !motionEnabled || !data?.theme?.sliderAutoplayEnabled || sliderPaused || storySlides.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((current) => (current + 1) % storySlides.length);
    }, autoplayDelay);

    return () => window.clearInterval(timer);
  }, [preview, motionEnabled, data?.theme?.sliderAutoplayEnabled, sliderPaused, storySlides.length, autoplayDelay]);

  useEffect(() => {
    if (!frameRef.current) return undefined;

    const root = frameRef.current;
    const parallaxTargets = Array.from(root.querySelectorAll("[data-parallax-speed]"));
    const progressTargets = Array.from(root.querySelectorAll("[data-progress-zone]"));

    if (preview || !parallaxEnabled) {
      parallaxTargets.forEach((node) => node.style.setProperty("--parallax-shift", "0px"));
      progressTargets.forEach((node) => node.style.setProperty("--section-progress", "0"));
      return undefined;
    }

    let rafId = 0;

    const update = () => {
      rafId = 0;
      const viewportHeight = window.innerHeight || 1;

      parallaxTargets.forEach((node) => {
        const speed = Number(node.dataset.parallaxSpeed || 0);
        const rect = node.getBoundingClientRect();
        const distanceFromCenter = rect.top + rect.height / 2 - viewportHeight / 2;
        const translate = -distanceFromCenter * speed * 0.14 * intensityFactor;
        node.style.setProperty("--parallax-shift", `${translate.toFixed(2)}px`);
      });

      progressTargets.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
        node.style.setProperty("--section-progress", progress.toFixed(3));
      });
    };

    const requestUpdate = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [preview, parallaxEnabled, intensityFactor]);

  if (!data) {
    return <div className="empty-state">Loading portfolio...</div>;
  }

  const themeStyle = {
    "--portfolio-primary": data.theme.primaryColor,
    "--portfolio-secondary": data.theme.secondaryColor,
    "--portfolio-bg": data.theme.backgroundColor,
    "--portfolio-text": data.theme.textColor || "#f6f7fb",
    "--portfolio-muted": data.theme.mutedTextColor || "#91a1bf",
    "--portfolio-surface": data.theme.surfaceColor || "rgba(10, 16, 28, 0.76)",
    "--portfolio-border": data.theme.borderColor || "rgba(255, 255, 255, 0.08)",
    "--portfolio-font":
      data.theme.fontFamily === "Inter"
        ? "Inter, sans-serif"
        : data.theme.fontFamily === "Manrope"
          ? "Manrope, sans-serif"
          : "Poppins, sans-serif",
    "--section-padding": `${data.theme.sectionPadding || 28}px`,
    "--panel-radius": `${data.theme.cardRadius || 30}px`,
    "--body-scale": data.theme.bodyScale || 1,
    "--heading-scale": data.theme.headingScale || 1,
    "--motion-base": `${0.72 * speedFactor}s`,
    "--motion-delay-step": `${0.085 * speedFactor}s`,
    "--motion-char-step": `${22 * speedFactor}ms`,
    "--motion-distance": `${18 * intensityFactor}px`,
    "--intro-duration": `${1.1 * speedFactor}s`,
    "--intro-zoom-scale": imageZoomEnabled ? `${1.14 + intensityFactor * 0.06}` : "1",
    "--hero-float-distance": `${10 * intensityFactor}px`,
    "--glow-strength": glowEnabled ? intensityFactor.toFixed(2) : "0",
    "--hero-glow-scale": glowEnabled ? (glowFactor * intensityFactor).toFixed(2) : "0",
  };

  const aboutPreview = stripHtml(data.profile.aboutHtml);
  const heroSection = sectionConfig.hero || {};
  const aboutSection = sectionConfig.about || {};
  const skillsSection = sectionConfig.skills || {};
  const experienceSection = sectionConfig.experience || {};
  const projectsSection = sectionConfig.projects || {};
  const achievementsSection = sectionConfig.achievements || {};
  const contactSection = sectionConfig.contact || {};
  const footerSection = sectionConfig.footer || {};

  const topHighlights = [
    ...(heroSection.highlightItems || []),
    data.skills?.[0]?.name,
    data.skills?.[1]?.name,
    data.skills?.[2]?.name,
    featuredProject?.title,
  ].filter((item, index, items) => item && items.indexOf(item) === index);

  const navItems = (siteConfig.sectionOrder || ["hero", "about", "skills", "experience", "projects", "achievements", "contact", "footer"])
    .filter((id) => id !== "footer" && sectionConfig[id]?.visible !== false)
    .map((id) => [id, sectionConfig[id]?.navLabel || id]);
  const orderedSectionIds = siteConfig.sectionOrder || ["hero", "about", "skills", "experience", "projects", "achievements", "contact", "footer"];
  const sectionHeadClassName = `portfolio-section-head ${siteConfig.sectionHeadingAlign === "center" ? "is-centered" : ""}`;

  function sectionOrderStyle(sectionId, offset = 0) {
    const index = orderedSectionIds.indexOf(sectionId);
    return { order: index === -1 ? 999 : index * 10 + offset };
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function goToSlide(index) {
    setCurrentSlide(index);
  }

  function goToNextSlide() {
    setCurrentSlide((current) => (current + 1) % storySlides.length);
  }

  function goToPreviousSlide() {
    setCurrentSlide((current) => (current - 1 + storySlides.length) % storySlides.length);
  }

  function handleSliderPointerDown(event) {
    if (storySlides.length < 2) return;
    pointerStateRef.current = { active: true, startX: event.clientX, deltaX: 0 };
    setSliderPaused(true);
    sliderViewportRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handleSliderPointerMove(event) {
    if (!pointerStateRef.current.active || !sliderViewportRef.current) return;
    const deltaX = event.clientX - pointerStateRef.current.startX;
    pointerStateRef.current.deltaX = deltaX;
    sliderViewportRef.current.style.setProperty("--drag-offset", `${deltaX}px`);
  }

  function handleSliderPointerUp(event) {
    if (!pointerStateRef.current.active || !sliderViewportRef.current) return;

    const { deltaX } = pointerStateRef.current;
    pointerStateRef.current = { active: false, startX: 0, deltaX: 0 };
    sliderViewportRef.current.style.setProperty("--drag-offset", "0px");
    sliderViewportRef.current.releasePointerCapture?.(event.pointerId);
    setSliderPaused(false);

    if (Math.abs(deltaX) < 48) return;
    if (deltaX < 0) goToNextSlide();
    else goToPreviousSlide();
  }

  return (
    <div
      ref={frameRef}
      className={`portfolio-frame ${data.theme.backgroundMode === "light" ? "theme-light" : "theme-dark"} ${
        preview ? "is-preview" : ""
      } ${motionEnabled ? "" : "animations-off"} ${glowEnabled ? "" : "glow-muted"} ${
        scrollAnimationsEnabled ? "" : "scroll-effects-off"
      } ${parallaxEnabled ? "" : "parallax-off"} ${backgroundEffectsEnabled ? "" : "background-effects-off"} ${
        imageZoomEnabled ? "" : "image-zoom-off"
      } ${introAnimationEnabled ? "" : "intro-sequence-off"} ${data.theme.buttonStyle === "square" ? "buttons-square" : ""}`}
      style={themeStyle}
    >
      <div className="portfolio-noise" aria-hidden="true" />

      <header className={`portfolio-topbar ${showTopbarBrand ? "" : "is-brandless"}`} data-reveal data-section-id="hero">
        {showTopbarBrand ? (
          <a className="portfolio-brand" href="#hero" onClick={closeMenu}>
            <span className="brand-mark">{siteConfig.brandMark || "AK"}</span>
            <span className="brand-copy">
              <strong>{data.profile.name}</strong>
              {siteConfig.brandSubtitle ? <small>{siteConfig.brandSubtitle}</small> : null}
            </span>
          </a>
        ) : (
          <span className="topbar-balance" aria-hidden="true" />
        )}

        <button
          type="button"
          className={`portfolio-menu-toggle ${menuOpen ? "is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`portfolio-nav ${menuOpen ? "is-open" : ""}`} aria-label="Section navigation">
          {navItems.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={activeSection === id ? "is-active" : ""} onClick={closeMenu}>
              {label}
            </a>
          ))}
          <a className="topbar-cta topbar-cta-mobile" href={siteConfig.primaryNavButtonLink || "#contact"} onClick={closeMenu} onPointerDown={triggerRipple}>
            {siteConfig.primaryNavButtonText || "Hire Me"}
          </a>
        </nav>

        <a className="topbar-cta topbar-cta-desktop" href={siteConfig.primaryNavButtonLink || "#contact"} onPointerDown={triggerRipple}>
          {siteConfig.primaryNavButtonText || "Hire Me"}
        </a>
      </header>

      {heroSection.visible !== false ? (
      <section className={`portfolio-hero-panel is-visible ${heroReady ? "hero-ready" : ""}`} data-progress-zone id="hero" style={sectionOrderStyle("hero", 0)}>
        <div className="hero-intro-curtain" aria-hidden="true" />
        <div className="hero-ambient" aria-hidden="true">
          <span className="hero-ambient-orb hero-ambient-orb-one" />
          <span className="hero-ambient-orb hero-ambient-orb-two" />
          <span className="hero-ambient-orb hero-ambient-orb-three" />
          <div className="hero-particle-field">
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={`particle-${index}`} className="hero-particle" style={{ "--particle-index": index }} />
            ))}
          </div>
        </div>

        <div className="hero-copy">
          <p className="portfolio-kicker hero-stagger">{heroSection.kicker || "Current Profile"}</p>
          <h1 className="hero-title hero-stagger">
            <AnimatedText text={data.profile.name} mode="chars" className="hero-name-text" />
          </h1>
          <h2 className="hero-stagger">
            <AnimatedText text={data.profile.headline} mode="words" className="hero-headline-text" />
          </h2>
          <p className="hero-summary hero-stagger">{data.profile.subheadline}</p>
          <p className="hero-detail hero-stagger">{heroSection.description || aboutPreview}</p>
          <div className="hero-actions hero-stagger">
            <a className="primary-button portfolio-button" href={heroSection.primaryButtonLink || "#projects"} onPointerDown={triggerRipple}>
              {heroSection.primaryButtonText || "View Projects"}
            </a>
            <a className="secondary-button portfolio-button" href={heroSection.secondaryButtonLink || "#contact"} onPointerDown={triggerRipple}>
              {heroSection.secondaryButtonText || "Hire Me"}
            </a>
          </div>
          <div className="hero-highlights hero-stagger">
            {topHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <a className="hero-scroll-indicator hero-stagger" href="#about" onPointerDown={triggerRipple}>
            <span className="hero-scroll-label">{heroSection.scrollLabel || "Scroll to explore"}</span>
            <span className="hero-scroll-arrow" aria-hidden="true">
              <span />
            </span>
          </a>
        </div>

        <div className="hero-visual">
          <div className="hero-glow hero-glow-one" data-parallax-speed="0.22" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" data-parallax-speed="0.12" aria-hidden="true" />
          <div className="hero-glow hero-glow-three" data-parallax-speed="0.18" aria-hidden="true" />
          <div className="hero-image-shell">
            <div className="hero-image-frame" data-parallax-speed="0.16">
              <div className="hero-image-aura" aria-hidden="true" />
              <div className="hero-image-rings" aria-hidden="true">
                <span />
                <span />
              </div>
              <div className="hero-image-grid" aria-hidden="true" />
              <div className="hero-image-sheen" aria-hidden="true" />
              <img src={data.profile.image} alt={data.profile.name} className="portfolio-avatar" />
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {heroSection.visible !== false ? (
      <section className="hero-stats-grid" data-reveal style={sectionOrderStyle("hero", 1)}>
        {statTargets.map((item) => (
          <StatCounter
            key={item.label}
            label={item.label}
            value={item.value}
            suffix={item.suffix}
            enabled={!preview && motionEnabled}
          />
        ))}
      </section>
      ) : null}

      {aboutSection.visible !== false ? (
      <section className="portfolio-section" id="about" data-section-id="about" data-reveal style={sectionOrderStyle("about")}>
        <div className={sectionHeadClassName}>
          <div>
            <p className="portfolio-kicker">{aboutSection.kicker || "About"}</p>
            <h3>{aboutSection.title || "Professional Summary"}</h3>
          </div>
          <p className="section-copy">{aboutSection.description}</p>
        </div>
        <div className="about-grid">
          <article className="portfolio-card about-story" data-parallax-speed="0.08">
            <div dangerouslySetInnerHTML={{ __html: data.profile.aboutHtml }} />
          </article>
          <article className="portfolio-card highlight-card" data-parallax-speed="0.12">
            <span className="detail-label">{aboutSection.highlightLabel || "Focus Areas"}</span>
            <div className="highlight-list">
              {topHighlights.map((item, index) => (
                <div key={item} className="highlight-row">
                  <span>{`0${index + 1}`}</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      ) : null}

      {skillsSection.visible !== false ? (
      <section className="portfolio-section" id="skills" data-section-id="skills" data-reveal style={sectionOrderStyle("skills")}>
        <div className={sectionHeadClassName}>
          <div>
            <p className="portfolio-kicker">{skillsSection.kicker || "Core Competencies"}</p>
            <h3>{skillsSection.title || "Multi-Skilled Capability Stack"}</h3>
          </div>
          <p className="section-copy">{skillsSection.description}</p>
        </div>
        <div className="skill-category-grid">
          {groupedSkills.map((group) => (
            <article key={group.category} className="skill-category-card" data-parallax-speed="0.09">
              <div className="skill-category-head">
                <span className="skill-glyph">{group.glyph || "00"}</span>
                <div>
                  <small>{group.eyebrow || "Capability"}</small>
                  <strong>{group.label || group.category}</strong>
                </div>
              </div>
              <p>{group.description || "Practical strengths presented through measurable skill depth."}</p>
              <div className="skill-bars">
                {group.items.map((skill) => (
                  <div key={skill.id} className="skill-bar">
                    <div className="skill-bar-head">
                      <span>{skill.name}</span>
                      <span>{skill.level}%</span>
                    </div>
                    <div className="skill-track">
                      <div className="skill-fill" style={{ width: `${skill.level}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {experienceSection.visible !== false ? (
      <section className="portfolio-section" id="experience" data-section-id="experience" data-reveal style={sectionOrderStyle("experience")}>
        <div className={sectionHeadClassName}>
          <div>
            <p className="portfolio-kicker">{experienceSection.kicker || "Professional Journey"}</p>
            <h3>{experienceSection.title || "Experience That Connects Accuracy With Growth"}</h3>
          </div>
          <p className="section-copy">{experienceSection.description}</p>
        </div>
        <div className="journey-layout">
          <div className="timeline-stack">
            {data.experiences.map((item, index) => (
              <article key={item.id} className="timeline-card" data-parallax-speed="0.06">
                <span className="timeline-marker">{`0${index + 1}`}</span>
                <div className="timeline-body">
                  <small>{item.duration}</small>
                  <strong>{item.role}</strong>
                  <span>{item.company}</span>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="journey-side">
            <article className="portfolio-card journey-note" data-parallax-speed="0.09">
              <span className="detail-label">{experienceSection.sideNoteLabel || "Working Style"}</span>
              <strong>{experienceSection.sideNoteTitle}</strong>
              <p>{experienceSection.sideNoteDescription}</p>
            </article>
            <article className="portfolio-card journey-note" data-parallax-speed="0.11">
              <span className="detail-label">{experienceSection.recognitionLabel || "Recognition"}</span>
              <div className="mini-achievement-list">
                {data.achievements.map((item) => (
                  <div key={item.id} className="mini-achievement">
                    <span>{achievementLabels[item.icon] || "Highlight"}</span>
                    <strong>{item.title}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
      ) : null}

      {projectsSection.visible !== false ? (
      <section className="portfolio-section portfolio-story-section" id="projects" data-section-id="projects" data-reveal data-progress-zone style={sectionOrderStyle("projects")}>
        <div className="portfolio-story-layout">
          <div className="portfolio-story-copy" data-parallax-speed="0.08">
            <p className="portfolio-kicker">{projectsSection.kicker || "Featured Projects"}</p>
            <h3>{projectsSection.title || "Execution That Looks Polished And Business-Ready"}</h3>
            <p className="section-copy">{projectsSection.description}</p>
            <div className="story-progress-row">
              <span>{String(currentSlide + 1).padStart(2, "0")}</span>
              <div className="story-progress-track">
                <div className="story-progress-fill" style={{ width: `${((currentSlide + 1) / Math.max(storySlides.length, 1)) * 100}%` }} />
              </div>
              <span>{String(storySlides.length).padStart(2, "0")}</span>
            </div>
          </div>

          <div className="project-slider-shell">
            <div
              ref={sliderViewportRef}
              className="project-slider-viewport"
              onPointerDown={handleSliderPointerDown}
              onPointerMove={handleSliderPointerMove}
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              onMouseEnter={() => setSliderPaused(true)}
              onMouseLeave={() => setSliderPaused(false)}
            >
              <div
                className="project-slider-track"
                style={{ transform: `translate3d(calc(-${currentSlide * 100}% + var(--drag-offset, 0px)), 0, 0)` }}
              >
                {storySlides.map((slide) => (
                  <ProjectSlide key={slide.id} slide={slide} onRipple={triggerRipple} />
                ))}
              </div>
            </div>

            <div className="project-slider-controls">
              <button type="button" className="slider-arrow" onClick={goToPreviousSlide} onPointerDown={triggerRipple} aria-label="Previous slide">
                Prev
              </button>
              <div className="slider-dots">
                {storySlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`slider-dot ${index === currentSlide ? "is-active" : ""}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <button type="button" className="slider-arrow" onClick={goToNextSlide} onPointerDown={triggerRipple} aria-label="Next slide">
                Next
              </button>
            </div>

            <div className="project-side-stack">
              {projectSidePanels.map((panel) => (
                <article key={panel.category} className="project-side-card" data-parallax-speed="0.07">
                  <span className="project-side-icon">{panel.glyph || "00"}</span>
                  <strong>{panel.label || panel.category}</strong>
                  <p>{panel.description || "Capabilities shown here update from the skills manager."}</p>
                  <div className="tag-row">
                    {panel.items.slice(0, 3).map((skill) => (
                      <span key={skill.id}>{skill.name}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {achievementsSection.visible !== false ? (
      <section className="portfolio-section" id="achievements" data-section-id="achievements" data-reveal style={sectionOrderStyle("achievements")}>
        <div className={sectionHeadClassName}>
          <div>
            <p className="portfolio-kicker">{achievementsSection.kicker || "Achievements"}</p>
            <h3>{achievementsSection.title || "Recognition And Learning Milestones"}</h3>
          </div>
          <p className="section-copy">{achievementsSection.description}</p>
        </div>
        <div className="achievement-grid">
          {data.achievements.map((item) => (
            <article key={item.id} className="achievement-card" data-parallax-speed="0.05">
              <span className="icon-pill">{achievementLabels[item.icon] || "Badge"}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {contactSection.visible !== false ? (
      <section className="portfolio-section" id="contact" data-section-id="contact" data-reveal style={sectionOrderStyle("contact")}>
        <article className="contact-copy contact-copy-wide contact-showcase">
          <div className="contact-glow-orb contact-glow-orb-one" data-parallax-speed="0.18" aria-hidden="true" />
          <div className="contact-glow-orb contact-glow-orb-two" data-parallax-speed="0.12" aria-hidden="true" />

          <div className="contact-showcase-copy">
            <p className="portfolio-kicker">{contactSection.kicker || "Contact"}</p>
            <div className="contact-signal">
              <span className="contact-signal-dot" />
              <span>{contactSection.availability}</span>
            </div>
            <h3>{contactSection.title}</h3>
            <p>{contactSection.description}</p>
          </div>

          <div className="contact-channel-grid">
            <a className="contact-channel-card" href={`mailto:${data.settings.email}`} onPointerDown={triggerRipple}>
              <span className="contact-channel-label">{contactSection.emailLabel || "Email"}</span>
              <strong>{data.settings.email}</strong>
              <small>{contactSection.emailHint}</small>
            </a>
            <a className="contact-channel-card" href={`tel:${data.settings.phone.replace(/\s+/g, "")}`} onPointerDown={triggerRipple}>
              <span className="contact-channel-label">{contactSection.phoneLabel || "Phone"}</span>
              <strong>{data.settings.phone}</strong>
              <small>{contactSection.phoneHint}</small>
            </a>
            <a className="contact-channel-card contact-channel-card-accent" href={data.settings.whatsappLink} target="_blank" rel="noreferrer" onPointerDown={triggerRipple}>
              <span className="contact-channel-label">{contactSection.whatsappLabel || "WhatsApp"}</span>
              <strong>{contactSection.whatsappTitle || "Start Instant Chat"}</strong>
              <small>{contactSection.whatsappHint}</small>
            </a>
          </div>

          {preview ? (
            <div className="preview-only-card">
              <strong>Live Preview Active</strong>
              <p>Profile, skills, projects, colors, and media changes from the admin panel appear here instantly.</p>
            </div>
          ) : null}
        </article>
      </section>
      ) : null}

      {footerSection.visible !== false ? (
      <footer className="portfolio-footer" data-reveal style={sectionOrderStyle("footer")}>
        <div>
          <strong>{data.profile.name}</strong>
          <p>{data.profile.headline}</p>
        </div>
        <span>{footerSection.seoFallback || data.settings.seoTitle}</span>
      </footer>
      ) : null}

      <a className="portfolio-whatsapp" href={data.settings.whatsappLink} target="_blank" rel="noreferrer" onPointerDown={triggerRipple}>
        WhatsApp
      </a>
    </div>
  );
}
