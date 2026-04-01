import React, { useEffect, useMemo, useRef, useState } from "react";

const defaultCategoryMeta = {
  Marketing: {
    label: "Marketing",
    eyebrow: "Reach & Conversion",
    description: "Campaign execution, audience targeting, and social growth support built around real business outcomes.",
    glyph: "01",
  },
  Tech: {
    label: "Tech",
    eyebrow: "Web & Build",
    description: "Professional websites, responsive layouts, and digital assets that improve trust and usability.",
    glyph: "02",
  },
  Analytics: {
    label: "Analytics",
    eyebrow: "Data & Reporting",
    description: "Excel-based analysis, structured reporting, and business-friendly data support for clearer decisions.",
    glyph: "03",
  },
  "AI Tools": {
    label: "AI Tools",
    eyebrow: "Research & Speed",
    description: "AI-assisted research, idea development, and productivity workflows for faster, smarter execution.",
    glyph: "04",
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

function toRgba(color, alpha) {
  if (!color) return `rgba(124, 156, 255, ${alpha})`;

  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (hex.length === 6) {
      const bigint = Number.parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return color.startsWith("rgb(")
    ? color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`)
    : color;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function normalizeExternalLink(value) {
  if (!value) return "";

  const trimmed = String(value).trim();
  if (!trimmed) return "";

  if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function buildWhatsAppHref(rawLink, rawPhone, text) {
  const encodedText = encodeURIComponent(text || "");
  const normalizedLink = String(rawLink || "").trim();
  const phoneDigits = String(rawPhone || "").replace(/\D/g, "");

  if (normalizedLink) {
    const hasQuery = normalizedLink.includes("?");
    const separator = hasQuery ? "&" : "?";
    return `${normalizedLink}${separator}text=${encodedText}`;
  }

  if (phoneDigits) {
    return `https://wa.me/${phoneDigits}?text=${encodedText}`;
  }

  return "";
}

function formatCaseStudyDescription(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const normalized = raw.replace(/\r\n/g, "\n");
  const labelPattern = /(Problem:|Solution:|Result:)/gi;

  if (labelPattern.test(normalized)) {
    const matches = Array.from(normalized.matchAll(/(Problem:|Solution:|Result:)/gi));
    return matches.map((match, index) => {
      const label = match[1];
      const start = match.index + label.length;
      const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
      const body = normalized.slice(start, end).trim().replace(/\s*\n+\s*/g, " ");
      return {
        label: label.replace(":", ""),
        body,
      };
    });
  }

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((body) => ({ label: "", body }));
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

function HeroStat({ label, value, suffix = "", enabled }) {
  const numericValue = Number.parseInt(value, 10);
  const isNumeric = Number.isFinite(numericValue);
  const display = useCountUp(isNumeric ? numericValue : 0, enabled && isNumeric);

  return (
    <article className="hero-stat">
      <strong>
        {isNumeric ? display : value}
        {suffix}
      </strong>
      <span>{label}</span>
    </article>
  );
}

function SocialIcon({ type }) {
  const icons = {
    linkedin: (
      <path d="M7.2 8.6h3.1V18H7.2V8.6Zm1.6-4.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm3.4 4.8h3v1.3h.1c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V18h-3.1v-4.4c0-1.1 0-2.4-1.5-2.4s-1.7 1.2-1.7 2.3V18h-3.1V8.6Z" />
    ),
    github: (
      <path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.5.1.6-.2.6-.5V18c-2.6.6-3.2-1.1-3.2-1.1-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.7-1.3-2.1-.2-4.4-1-4.4-4.7 0-1 .4-1.9 1.1-2.6-.1-.3-.5-1.2.1-2.5 0 0 .9-.3 2.9 1a10.1 10.1 0 0 1 5.3 0c2-1.3 2.9-1 2.9-1 .6 1.3.2 2.2.1 2.5.7.7 1.1 1.6 1.1 2.6 0 3.7-2.3 4.5-4.5 4.7.4.3.7 1 .7 2v2.9c0 .3.1.6.6.5A9.2 9.2 0 0 0 12 2.8Z" />
    ),
    whatsapp: (
      <path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L3 21l4.5-1.2A9.2 9.2 0 1 0 12 2.8Zm0 16.7c-1.4 0-2.7-.4-3.9-1.1l-.3-.2-2.7.7.7-2.6-.2-.3a7.2 7.2 0 1 1 6.4 3.5Zm3.9-5.3c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.4.5c-.1.2-.3.2-.5.1a6 6 0 0 1-1.8-1.1 6.8 6.8 0 0 1-1.3-1.6c-.1-.2 0-.3.1-.5l.4-.4c.1-.1.2-.3.3-.4.1-.1 0-.3 0-.5l-.7-1.6c-.2-.4-.4-.3-.6-.3h-.5c-.2 0-.5.1-.7.4-.2.2-.9.9-.9 2.2 0 1.3 1 2.6 1.1 2.8.1.2 2 3 4.8 4.2.7.3 1.3.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3Z" />
    ),
    email: (
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2 0v.2l6 4.7 6-4.7v-.2a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5Zm12 2.7-5.4 4.2a1 1 0 0 1-1.2 0L6 9.2v8.3c0 .3.2.5.5.5h11c.3 0 .5-.2.5-.5V9.2Z" />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[type] || icons.email}
    </svg>
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

  const projectHref = normalizeExternalLink(slide.liveLink);
  const caseStudyBlocks = formatCaseStudyDescription(slide.description);

  return (
    <article className="story-slide-card story-slide-card-text">
      <div className="story-slide-copy story-slide-copy-text">
        <span className="story-slide-eyebrow">{slide.eyebrow || "Project Spotlight"}</span>
        <strong>{slide.title}</strong>
        <div className="case-study-copy">
          {caseStudyBlocks.map((block, index) => (
            <p key={`${block.label || "line"}-${index}`}>
              {block.label ? <strong>{`${block.label}: `}</strong> : null}
              <span>{block.body}</span>
            </p>
          ))}
        </div>
        <div className="tag-row">
          {slide.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {projectHref ? (
          <a className="primary-button portfolio-button" href={projectHref} target="_blank" rel="noreferrer" onPointerDown={onRipple}>
            View Project
          </a>
        ) : null}
      </div>
    </article>
  );
}

function PricingGlyph({ type }) {
  const icons = {
    plus: "+",
    shield: "S",
    crown: "P",
    spark: "*",
  };

  return <span aria-hidden="true">{icons[type] || "+"}</span>;
}

function PricingExtraRow({ item }) {
  return (
    <article className="pricing-extra-card">
      <strong>{item.label}</strong>
      <span>
        {item.price}
        {item.suffix || ""}
      </span>
    </article>
  );
}

function PricingCard({ plan, featured, onSelect, onRipple }) {
  return (
    <article className={`pricing-card ${featured ? "is-featured" : ""}`} data-parallax-speed="0.05">
      {plan.badge ? <span className="pricing-badge">{plan.badge}</span> : null}
      <div className="pricing-card-head">
        <span className="pricing-icon-pill">
          <PricingGlyph type={plan.iconKey} />
        </span>
        <div>
          <strong>{plan.name}</strong>
          <p>{plan.price}</p>
        </div>
      </div>
      <ul className="pricing-feature-list">
        {(plan.features || []).map((feature) => (
          <li key={feature}>
            <span className="pricing-feature-check" aria-hidden="true">•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button type="button" className={`portfolio-button ${featured ? "primary-button" : "secondary-button"} pricing-card-button`} onClick={() => onSelect(plan)} onPointerDown={onRipple}>
        {plan.ctaLabel || "Buy Now"}
      </button>
    </article>
  );
}

function PurchaseModal({
  open,
  plan,
  pricingSection,
  onClose,
  onContinue,
  onRipple,
  showSuccess,
}) {
  if (!open || !plan) return null;

  return (
    <div className="purchase-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="purchase-modal" role="dialog" aria-modal="true" aria-label={pricingSection.modalTitle || "Choose your payment method"} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="purchase-modal-close" onClick={onClose} aria-label="Close purchase modal">
          ×
        </button>
        <span className="portfolio-kicker">{pricingSection.kicker || "Pricing"}</span>
        <h3>{pricingSection.modalTitle || "Choose your payment method"}</h3>
        <p className="purchase-modal-copy">{pricingSection.modalHelper}</p>
        <div className="purchase-plan-summary">
          <strong>{plan.name}</strong>
          <span>{plan.price}</span>
        </div>
        <div className="purchase-method-grid">
          {[pricingSection.paymentMethodRazorpay, pricingSection.paymentMethodUpi, pricingSection.paymentMethodCards].filter(Boolean).map((item) => (
            <article key={item} className="purchase-method-pill">
              <span className="purchase-method-dot" aria-hidden="true" />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
        {showSuccess ? (
          <div className="purchase-success-message">
            <strong>{pricingSection.successMessage || "Thank you! We will contact you within 24 hours"}</strong>
          </div>
        ) : null}
        <div className="purchase-modal-actions">
          <button type="button" className="secondary-button portfolio-button" onClick={onClose} onPointerDown={onRipple}>
            Close
          </button>
          <button type="button" className="primary-button portfolio-button" onClick={onContinue} onPointerDown={onRipple}>
            {pricingSection.paymentPrimaryButton || plan.ctaLabel || "Continue Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioView({ data, preview = false }) {
  const frameRef = useRef(null);
  const hashNavigationMode = !preview && typeof window !== "undefined" && Boolean(window.location.hash);

  const [activeSection, setActiveSection] = useState("hero");
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", message: "" });
  const [selectedPricingPlan, setSelectedPricingPlan] = useState(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
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
    const preferredOrder = ["Marketing", "Tech"];
    const filtered = preferredOrder
      .map((category) => groupedSkills.find((group) => group.category === category))
      .filter(Boolean);

    if (filtered.length) {
      return filtered.slice(0, 2);
    }

    return groupedSkills
      .filter((group) => !["AI Tools", "Analytics"].includes(group.category))
      .slice(0, 2);
  }, [groupedSkills]);

  const storySlides = useMemo(() => {
    return (data?.projects || []).map((project) => ({
      type: "project",
      id: project.id,
      title: project.title,
      description: project.description,
      image: project.image,
      liveLink: project.liveLink,
      tags: project.tags || [],
      eyebrow: sectionConfig.projects?.projectEyebrow || "Project Spotlight",
    }));
  }, [data, sectionConfig.projects?.projectEyebrow]);

  const motionEnabled = data?.theme?.animationsEnabled !== false;
  const introAnimationEnabled = motionEnabled && data?.theme?.introAnimationEnabled !== false;
  const scrollAnimationsEnabled = motionEnabled && data?.theme?.scrollAnimationsEnabled !== false;
  const parallaxEnabled = motionEnabled && data?.theme?.parallaxEnabled !== false;
  const glowEnabled = motionEnabled && data?.theme?.glowEnabled !== false;
  const backgroundEffectsEnabled = motionEnabled && data?.theme?.backgroundEffectsEnabled !== false;
  const imageZoomEnabled = introAnimationEnabled && data?.theme?.imageZoomEnabled !== false;
  const speedFactor = speedMap[data?.theme?.animationSpeed] || 1;
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
    const hasHashTarget = hashNavigationMode;

    function revealHashTarget() {
      const hash = window.location.hash?.replace("#", "");
      if (!hash) return;

      const target = root.querySelector(`#${hash}`);
      if (!(target instanceof HTMLElement)) return;

      target.classList.add("is-visible");
      const nestedRevealTargets = Array.from(target.querySelectorAll("[data-reveal]"));
      nestedRevealTargets.forEach((node) => node.classList.add("is-visible"));

      if (target.dataset?.sectionId) {
        setActiveSection(target.dataset.sectionId);
      }
    }

    if (preview || !scrollAnimationsEnabled) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      revealHashTarget();
    }

    if (hasHashTarget) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      revealHashTarget();
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

    if (!preview && scrollAnimationsEnabled && !hasHashTarget) {
      revealTargets.forEach((target) => revealObserver.observe(target));
      revealHashTarget();
      window.addEventListener("hashchange", revealHashTarget);
    } else if (!preview) {
      window.addEventListener("hashchange", revealHashTarget);
    }
    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
      window.removeEventListener("hashchange", revealHashTarget);
    };
  }, [preview, scrollAnimationsEnabled, data, hashNavigationMode]);

  useEffect(() => {
    if (!hashNavigationMode || !frameRef.current) return undefined;

    let timeoutId = 0;
    let rafId = 0;

    const root = frameRef.current;

    const revealAndScroll = () => {
      const hash = window.location.hash?.replace("#", "");
      if (!hash) return;

      root.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-visible"));

      const target = root.querySelector(`#${hash}`);
      if (!(target instanceof HTMLElement)) return;

      target.classList.add("is-visible");
      rafId = requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      });
    };

    timeoutId = window.setTimeout(revealAndScroll, 180);
    window.addEventListener("hashchange", revealAndScroll);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("hashchange", revealAndScroll);
    };
  }, [hashNavigationMode, data]);

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

  useEffect(() => {
    if (preview) return undefined;

    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(scrollTop / maxScroll, 1);
      setScrollProgress(progress);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [preview]);

  if (!data) {
    return <div className="empty-state">Loading portfolio...</div>;
  }

  const currentMode = "dark";
  const isLightMode = currentMode === "light";
  const primaryColor = data.theme.primaryColor;
  const secondaryColor = data.theme.secondaryColor;
  const glowColor = data.theme.glowColor || primaryColor;
  const aboutPreview = stripHtml(data.profile.aboutHtml);
  const heroSection = sectionConfig.hero || {};
  const heroTitleClassName = [
    "hero-title",
    "hero-stagger",
    "hero-heading-plain",
    heroSection.headlineBold ? "hero-title-strong" : "",
    heroSection.headlineGlow ? "hero-title-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heroRoleClassName = [
    "hero-stagger",
    "hero-role-line",
    "hero-role-heading",
    heroSection.headlineBold ? "hero-role-strong" : "",
    heroSection.headlineGlow ? "hero-role-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heroSummaryClassName = [
    "hero-summary",
    "hero-stagger",
    heroSection.bodyBold ? "hero-copy-strong" : "",
    heroSection.bodyGlow ? "hero-copy-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heroDetailClassName = [
    "hero-detail",
    "hero-stagger",
    heroSection.bodyBold ? "hero-copy-strong" : "",
    heroSection.bodyGlow ? "hero-copy-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const aboutSection = sectionConfig.about || {};
  const heroEyebrowClassName = [
    "portfolio-kicker",
    "hero-eyebrow",
    heroSection.chipBold ? "hero-chip-strong" : "",
    heroSection.chipGlow ? "hero-chip-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heroMetaChipClassName = [
    "hero-meta-chip",
    heroSection.chipBold ? "hero-chip-strong" : "",
    heroSection.chipGlow ? "hero-chip-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const secondaryButtonClassName = [
    heroSection.secondaryButtonSolid ? "primary-button" : "secondary-button",
    "portfolio-button",
  ]
    .filter(Boolean)
    .join(" ");
  const clientProjectButtonClassName = [
    heroSection.clientProjectButtonSolid ? "primary-button" : "secondary-button",
    "portfolio-button",
    "portfolio-button-client",
  ]
    .filter(Boolean)
    .join(" ");
  const aboutStoryImage = Object.prototype.hasOwnProperty.call(aboutSection, "storyImage")
    ? aboutSection.storyImage
    : "/media/about-story-visual.png";
  const aboutStoryClassName = [
    "portfolio-card",
    "about-story",
    aboutSection.storyTextBold ? "about-story-strong" : "",
    aboutSection.storyTextGlow ? "about-story-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const servicesSection = sectionConfig.services || {};
  const skillsSection = sectionConfig.skills || {};
  const experienceSection = sectionConfig.experience || {};
  const projectsSection = sectionConfig.projects || {};
  const pricingSection = sectionConfig.pricing || {};
  const achievementsSection = sectionConfig.achievements || {};
  const contactSection = sectionConfig.contact || {};
  const footerSection = sectionConfig.footer || {};

  const themeStyle = {
    "--portfolio-primary": primaryColor,
    "--portfolio-secondary": secondaryColor,
    "--portfolio-glow": glowColor,
    "--portfolio-glow-soft": toRgba(glowColor, isLightMode ? 0.16 : 0.28),
    "--portfolio-glow-strong": toRgba(glowColor, isLightMode ? 0.22 : 0.52),
    "--portfolio-secondary-soft": toRgba(secondaryColor, isLightMode ? 0.12 : 0.22),
    "--portfolio-bg": isLightMode ? "#edf4fb" : data.theme.backgroundColor,
    "--portfolio-text": isLightMode ? "#081120" : data.theme.textColor || "#f6f7fb",
    "--portfolio-muted": isLightMode ? "#5f6d86" : data.theme.mutedTextColor || "#91a1bf",
    "--portfolio-surface": isLightMode ? "rgba(255, 255, 255, 0.72)" : data.theme.surfaceColor || "rgba(10, 16, 28, 0.76)",
    "--portfolio-border": isLightMode ? "rgba(16, 21, 33, 0.08)" : data.theme.borderColor || "rgba(255, 255, 255, 0.08)",
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
    "--hero-overlay-opacity": `${Math.max(0, Math.min(Number(heroSection.overlayOpacity ?? 44), 100)) / 100}`,
  };
  const heroOverlayImages = (
    Array.isArray(heroSection.overlayImages) && heroSection.overlayImages.length
      ? heroSection.overlayImages
      : [
          heroSection.overlayImageOne || "/media/ai-tools-showcase.png",
          heroSection.overlayImageTwo || "/media/meta-showcase.webp",
          heroSection.overlayImageThree || "/media/web-dev-showcase-1.png",
          heroSection.overlayImageFour || "/media/web-dev-showcase-2.jpg",
        ]
  ).filter(Boolean);
  const projectVisualCards = [
    {
      image: projectsSection.visualPrimaryImage || "/media/ai-tools-showcase.png",
      label: projectsSection.visualPrimaryLabel || "AI Research & Tools",
      title: projectsSection.visualPrimaryTitle || "Smart workflow support for faster execution",
    },
    {
      image: projectsSection.visualSecondaryImage || "/media/meta-showcase.webp",
      label: projectsSection.visualSecondaryLabel || "Meta Ads",
      title: projectsSection.visualSecondaryTitle || "Campaign-focused digital growth",
    },
  ].filter((item) => item.image || item.label || item.title);

  const topHighlights = [
    ...(heroSection.highlightItems || []),
    data.skills?.[0]?.name,
    data.skills?.[1]?.name,
    data.skills?.[2]?.name,
    featuredProject?.title,
  ].filter((item, index, items) => item && items.indexOf(item) === index);

  const heroStats = Array.isArray(heroSection.statsItems) && heroSection.statsItems.length
    ? heroSection.statsItems
    : [
        { value: "2", suffix: "+", label: "Experience" },
        { value: String(Math.max(data?.projects?.length || 1, 1)), suffix: "+", label: "Projects" },
        { value: String(Math.max(data?.skills?.length || 7, 7)), suffix: "+", label: "Technologies" },
        { value: "4", suffix: "+", label: "Clients" },
      ];

  const socialLinks = [
    { key: "linkedin", href: data.settings.linkedinLink, label: "LinkedIn" },
    { key: "github", href: data.settings.githubLink, label: "GitHub" },
    { key: "whatsapp", href: data.settings.whatsappLink, label: "WhatsApp" },
    { key: "email", href: data.settings.email ? `mailto:${data.settings.email}` : "", label: "Email" },
  ].filter((item) => item.href);
  const heroHeadlineParts = String(data.profile.headline || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const defaultOrder = ["hero", "about", "services", "skills", "experience", "projects", "pricing", "achievements", "contact", "footer"];
  const normalizedOrder = [...(siteConfig.sectionOrder || defaultOrder)];
  if (sectionConfig.experience && !normalizedOrder.includes("experience")) {
    const insertIndex = normalizedOrder.indexOf("projects");
    if (insertIndex === -1) normalizedOrder.push("experience");
    else normalizedOrder.splice(insertIndex, 0, "experience");
  }
  if (sectionConfig.pricing && !normalizedOrder.includes("pricing")) {
    const insertIndex = normalizedOrder.indexOf("achievements");
    if (insertIndex === -1) normalizedOrder.push("pricing");
    else normalizedOrder.splice(insertIndex, 0, "pricing");
  }

  const navItems = normalizedOrder
    .filter((id) => id !== "footer" && sectionConfig[id]?.visible !== false)
    .map((id) => [id, sectionConfig[id]?.navLabel || id]);
  const orderedSectionIds = normalizedOrder;
  const sectionHeadClassName = `portfolio-section-head ${siteConfig.sectionHeadingAlign === "center" ? "is-centered" : ""}`;
  const pricingPlans = Array.isArray(data.pricingPlans) ? data.pricingPlans : [];
  const pricingExtras = Array.isArray(data.pricingExtras) ? data.pricingExtras : [];
  const featuredPricingPlan = pricingPlans.find((plan) => plan.highlighted) || pricingPlans[1] || pricingPlans[0] || null;

  function sectionOrderStyle(sectionId, offset = 0) {
    const index = orderedSectionIds.indexOf(sectionId);
    return { order: index === -1 ? 999 : index * 10 + offset };
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleContactFieldChange(field, value) {
    setContactForm((current) => ({ ...current, [field]: value }));
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    const lines = [
      `${contactSection.formNameLabel || "Name"}: ${contactForm.name}`,
      `${contactSection.formPhoneLabel || "Phone"}: ${contactForm.phone}`,
      "",
      `${contactSection.formMessageLabel || "Message"}:`,
      contactForm.message,
    ];
    const whatsappHref = buildWhatsAppHref(
      data.settings.whatsappLink,
      data.settings.phone,
      lines.join("\n"),
    );

    if (whatsappHref) {
      window.open(whatsappHref, "_blank", "noopener,noreferrer");
    }
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

  function openPricingModal(plan) {
    setSelectedPricingPlan(plan || featuredPricingPlan);
    setPurchaseSuccess(false);
    setPurchaseModalOpen(true);
  }

  function closePricingModal() {
    setPurchaseModalOpen(false);
    setPurchaseSuccess(false);
  }

  function handlePurchaseContinue() {
    const plan = selectedPricingPlan || featuredPricingPlan;
    if (!plan) return;

    const purchaseMessage = [
      "Hello, I want to purchase a doctor website package.",
      `Package: ${plan.name}`,
      `Price: ${plan.price}`,
    ].join("\n");

    const actionType = plan.actionType || "modal";
    const directHref = normalizeExternalLink(plan.ctaLink);
    const whatsappHref = buildWhatsAppHref(data.settings.whatsappLink, data.settings.phone, purchaseMessage);
    const nextHref = actionType === "payment-link" && directHref ? directHref : actionType === "whatsapp" ? whatsappHref : directHref || whatsappHref;

    if (nextHref && !preview && typeof window !== "undefined") {
      window.open(nextHref, "_blank", "noopener,noreferrer");
    }

    setPurchaseSuccess(true);
  }

  return (
    <div
      ref={frameRef}
      className={`portfolio-frame ${currentMode === "light" ? "theme-light" : "theme-dark"} ${
        preview ? "is-preview" : ""
      } ${motionEnabled ? "" : "animations-off"} ${glowEnabled ? "" : "glow-muted"} ${
        scrollAnimationsEnabled ? "" : "scroll-effects-off"
      } ${parallaxEnabled ? "" : "parallax-off"} ${backgroundEffectsEnabled ? "" : "background-effects-off"} ${
        imageZoomEnabled ? "" : "image-zoom-off"
      } ${introAnimationEnabled ? "" : "intro-sequence-off"} ${data.theme.buttonStyle === "square" ? "buttons-square" : ""} ${
        hashNavigationMode ? "hash-navigation" : ""
      }`}
      style={themeStyle}
    >
      <div className="scroll-progress-indicator" aria-hidden="true">
        <span style={{ transform: `scaleX(${scrollProgress})` }} />
      </div>
      <div className="portfolio-noise" aria-hidden="true" />

      {heroSection.visible !== false ? (
      <section className={`hero-showcase-shell is-visible ${heroReady ? "hero-ready" : ""}`} data-progress-zone data-section-id="hero" id="hero" style={sectionOrderStyle("hero", 0)}>
        <div className="hero-intro-curtain" aria-hidden="true" />
        {heroOverlayImages.length ? (
          <div className="hero-showcase-overlay" aria-hidden="true">
            {heroOverlayImages.map((image, index) => (
              <img
                key={`${image}-${index}`}
                className={`hero-showcase-overlay-slide ${index === 0 ? "is-initial" : ""}`}
                src={image}
                alt=""
                loading="eager"
                style={{ animationDelay: `${index * 5.5}s` }}
              />
            ))}
            <span className="hero-showcase-overlay-scrim" />
          </div>
        ) : null}
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

        <header className={`portfolio-topbar ${showTopbarBrand ? "" : "is-brandless"}`}>
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
          </nav>
        </header>

        <div className={`portfolio-hero-panel is-visible ${heroReady ? "hero-ready" : ""}`}>
          <div className="hero-copy">
            <p className={heroEyebrowClassName}>{heroSection.introLabel || "Hello, I'm"}</p>
            <span className={heroMetaChipClassName}>{heroSection.kicker || "Current Profile"}</span>
            <h1 className={heroTitleClassName}>{data.profile.name}</h1>
            <h2 className={heroRoleClassName}>
              {heroHeadlineParts.length ? (
                <span className="hero-role-parts">
                  {heroHeadlineParts.map((part, index) => (
                    <React.Fragment key={`${part}-${index}`}>
                      {index > 0 ? <span className="hero-role-separator" aria-hidden="true">|</span> : null}
                      <span className="hero-role-part">{part}</span>
                    </React.Fragment>
                  ))}
                </span>
              ) : (
                data.profile.headline
              )}
            </h2>
            <p className={heroSummaryClassName}>{data.profile.subheadline}</p>
            <p className={heroDetailClassName}>{heroSection.description || aboutPreview}</p>

            {socialLinks.length ? (
              <div className="hero-socials hero-stagger">
                {socialLinks.map((item) => (
                  <a key={item.key} className="hero-social-link" href={item.href} target={item.key === "email" ? undefined : "_blank"} rel={item.key === "email" ? undefined : "noreferrer"} aria-label={item.label}>
                    <SocialIcon type={item.key} />
                  </a>
                ))}
              </div>
            ) : null}

            <div className="hero-actions hero-stagger">
              <a className="primary-button portfolio-button" href={heroSection.primaryButtonLink || "#projects"} onPointerDown={triggerRipple}>
                {heroSection.primaryButtonText || "View Projects"}
              </a>
              <a className={secondaryButtonClassName} href={heroSection.secondaryButtonLink || "#contact"} onPointerDown={triggerRipple}>
                {heroSection.secondaryButtonText || "Hire Me"}
              </a>
              {heroSection.clientProjectButtonLink ? (
                <a
                  className={clientProjectButtonClassName}
                  href={normalizeExternalLink(heroSection.clientProjectButtonLink)}
                  target="_blank"
                  rel="noreferrer"
                  onPointerDown={triggerRipple}
                >
                  {heroSection.clientProjectButtonText || "Real Client Project"}
                </a>
              ) : null}
            </div>
            <div className="hero-highlights hero-stagger">
              {topHighlights.map((item) => (
                <span
                  key={item}
                  className={[
                    heroSection.chipBold ? "hero-chip-strong" : "",
                    heroSection.chipGlow ? "hero-chip-glow" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {item}
                </span>
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
              <div className="hero-image-frame hero-image-frame-portrait" data-parallax-speed="0.16">
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
        </div>

        <div className="hero-stats-bar">
          {heroStats.slice(0, 4).map((item) => (
            <HeroStat
              key={`${item.label}-${item.value}`}
              label={item.label}
              value={item.value}
              suffix={item.suffix || ""}
              enabled={!preview && motionEnabled}
            />
          ))}
        </div>
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
          <article className={aboutStoryClassName} data-parallax-speed="0.08">
            <div className="about-story-copy" dangerouslySetInnerHTML={{ __html: data.profile.aboutHtml }} />
            {aboutStoryImage ? (
              <div className="about-story-inline-visual">
                <img src={aboutStoryImage} alt={aboutSection.title || "About story visual"} loading="lazy" />
              </div>
            ) : null}
          </article>
          {aboutSection.visualImage ? (
            <article className="portfolio-card about-visual-card" data-parallax-speed="0.1">
              <div className="about-story-visual">
                <img src={aboutSection.visualImage} alt={aboutSection.title || "About visual"} loading="lazy" />
              </div>
            </article>
          ) : null}
          <article className="portfolio-card highlight-card" data-parallax-speed="0.12">
            <span className="detail-label">{aboutSection.highlightLabel || "Skills"}</span>
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

      {servicesSection.visible !== false ? (
      <section className="portfolio-section" id="services" data-section-id="services" data-reveal style={sectionOrderStyle("services")}>
        <div className={sectionHeadClassName}>
          <div>
            <p className="portfolio-kicker">{servicesSection.kicker || "Services"}</p>
            <h3>{servicesSection.title || "What I Help Businesses With"}</h3>
          </div>
          <p className="section-copy">{servicesSection.description}</p>
        </div>
          <div className="services-grid">
            {(data.services || []).map((service, index) => (
              <article key={service.id || `${service.title}-${index}`} className="service-card" data-parallax-speed="0.07">
                {service.image ? (
                  <div className="service-card-media">
                    <img src={service.image} alt={service.title || "Service"} loading="lazy" />
                  </div>
                ) : null}
                <span className="service-index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{service.title}</strong>
                <p>{service.description}</p>
              </article>
            ))}
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
            <p className="portfolio-kicker">{experienceSection.kicker || "Experience"}</p>
            <h3>{experienceSection.title || "Career Timeline"}</h3>
          </div>
          <p className="section-copy">{experienceSection.description}</p>
        </div>
        <div className="experience-timeline">
          {data.experiences.map((item, index) => (
            <article key={item.id} className="timeline-item" data-parallax-speed="0.06">
              <span className="timeline-dot" aria-hidden="true" />
              <div className="timeline-content">
                <small>{item.duration}</small>
                <strong>{item.role}</strong>
                <span>{item.company}</span>
                <p>{item.description}</p>
              </div>
              {index < data.experiences.length - 1 ? <span className="timeline-line" aria-hidden="true" /> : null}
            </article>
          ))}
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
            {projectVisualCards.length ? (
              <div className="story-visual-stack" data-parallax-speed="0.05">
                {projectVisualCards.map((card, index) => (
                  <article
                    key={`${card.label}-${index}`}
                    className={`story-visual-card ${index === 0 ? "story-visual-card-main" : "story-visual-card-secondary"}`}
                  >
                    {card.image ? <img src={card.image} alt={card.label || `Project visual ${index + 1}`} className="story-visual-image" loading="lazy" /> : null}
                    <div className={`story-visual-overlay ${index === 1 ? "story-visual-overlay-compact" : ""}`}>
                      {card.label ? <span>{card.label}</span> : null}
                      {card.title ? <strong>{card.title}</strong> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <div className="project-slider-shell">
            <div className="project-slider-viewport">
              <div
                className="project-slider-track"
                style={{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)` }}
              >
                {storySlides.map((slide) => (
                  <ProjectSlide key={slide.id} slide={slide} onRipple={triggerRipple} />
                ))}
              </div>
            </div>

            {storySlides.length > 1 ? (
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
            ) : null}

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

      {pricingSection.visible !== false ? (
      <section className="portfolio-section pricing-section" id="pricing" data-section-id="pricing" data-reveal style={sectionOrderStyle("pricing")}>
        <div className={`${sectionHeadClassName} pricing-section-head`}>
          <div>
            <p className="portfolio-kicker">{pricingSection.kicker || "Pricing"}</p>
            <h3>{pricingSection.title || "Doctor Website Packages"}</h3>
          </div>
          <p className="section-copy">{pricingSection.description || "Choose the best plan to grow your clinic online"}</p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.id || plan.name}
              plan={plan}
              featured={Boolean(plan.highlighted)}
              onSelect={openPricingModal}
              onRipple={triggerRipple}
            />
          ))}
        </div>

        {pricingExtras.length ? (
          <div className="pricing-extras-shell">
            <div className="pricing-extras-head">
              <span className="detail-label">{pricingSection.extrasTitle || "Extra Features"}</span>
            </div>
            <div className="pricing-extras-grid">
              {pricingExtras.map((item) => (
                <PricingExtraRow key={item.id || item.label} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        <article className="pricing-trust-card">
          <span className="detail-label">{pricingSection.trustTitle || "Trusted by Clinics"}</span>
          <strong>{pricingSection.trustLine || "Simple, fast, and conversion-focused doctor websites built to improve trust and appointment enquiries."}</strong>
          {pricingSection.testimonialLine ? <p>{pricingSection.testimonialLine}</p> : null}
        </article>
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

          <form className="contact-form-glass" onSubmit={handleContactSubmit}>
            <label>
              {contactSection.formNameLabel || "Name"}
              <input
                type="text"
                value={contactForm.name}
                onChange={(event) => handleContactFieldChange("name", event.target.value)}
                placeholder={contactSection.formNamePlaceholder || "Your name"}
                required
              />
            </label>
              <label>
                {contactSection.formPhoneLabel || "Phone"}
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(event) => handleContactFieldChange("phone", event.target.value)}
                  placeholder={contactSection.formPhonePlaceholder || "Your phone number"}
                  required
                />
              </label>
            <label className="full-span">
              {contactSection.formMessageLabel || "Message"}
              <textarea
                value={contactForm.message}
                onChange={(event) => handleContactFieldChange("message", event.target.value)}
                placeholder={contactSection.formMessagePlaceholder || "Write your project details"}
                required
              />
            </label>
            <button type="submit" className="primary-button portfolio-button full-span" onPointerDown={triggerRipple}>
              {contactSection.formButtonText || "Send Message"}
            </button>
          </form>

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

      {pricingSection.visible !== false && featuredPricingPlan ? (
        <button type="button" className="pricing-mobile-sticky-cta" onClick={() => openPricingModal(featuredPricingPlan)} onPointerDown={triggerRipple}>
          {pricingSection.mobileStickyLabel || featuredPricingPlan.ctaLabel || "Get Started"}
        </button>
      ) : null}

      <PurchaseModal
        open={purchaseModalOpen}
        plan={selectedPricingPlan || featuredPricingPlan}
        pricingSection={pricingSection}
        onClose={closePricingModal}
        onContinue={handlePurchaseContinue}
        onRipple={triggerRipple}
        showSuccess={purchaseSuccess}
      />
    </div>
  );
}
