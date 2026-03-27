import React, { useEffect, useMemo, useRef, useState } from "react";

const categoryMeta = {
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

const achievementLabels = {
  award: "Award",
  certificate: "Certified",
  star: "Recognized",
  bolt: "Fast Learner",
};

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

export default function PortfolioView({ data, preview = false }) {
  const frameRef = useRef(null);
  const [activeSection, setActiveSection] = useState("hero");

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
      ...categoryMeta[category],
    }));
  }, [data]);

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

  const statTargets = useMemo(
    () => [
      { label: "Years Building Skills", value: Math.max(data?.experiences?.length || 0, 2), suffix: "+" },
      { label: "Projects & Real Work", value: Math.max(data?.projects?.length || 0, 1), suffix: "+" },
      { label: "Core Skills", value: data?.skills?.length || 0, suffix: "+" },
      { label: "Achievements", value: data?.achievements?.length || 0, suffix: "" },
    ],
    [data],
  );

  useEffect(() => {
    if (!frameRef.current) return undefined;

    const root = frameRef.current;
    const revealTargets = Array.from(root.querySelectorAll("[data-reveal]"));
    const sections = Array.from(root.querySelectorAll("[data-section-id]"));

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

    revealTargets.forEach((target) => revealObserver.observe(target));
    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, [data, preview]);

  if (!data) {
    return <div className="empty-state">Loading portfolio...</div>;
  }

  const themeStyle = {
    "--portfolio-primary": data.theme.primaryColor,
    "--portfolio-secondary": data.theme.secondaryColor,
    "--portfolio-bg": data.theme.backgroundColor,
    "--portfolio-font":
      data.theme.fontFamily === "Inter"
        ? "Inter, sans-serif"
        : data.theme.fontFamily === "Manrope"
          ? "Manrope, sans-serif"
          : "Poppins, sans-serif",
  };

  const aboutPreview = stripHtml(data.profile.aboutHtml);
  const contactSettings = {
    kicker: data.settings.contactKicker || "Contact",
    title: data.settings.contactTitle || "Let&apos;s Build Something That Looks Professional And Works Hard",
    description:
      data.settings.contactDescription ||
      "Open to opportunities where financial accuracy, digital visibility, and practical web execution can create stronger business results.",
    availability:
      data.settings.contactAvailability || "Available for business support, portfolio websites, and growth-focused freelance work.",
  };
  const topHighlights = [
    data.skills?.[0]?.name,
    data.skills?.[1]?.name,
    data.skills?.[2]?.name,
    featuredProject?.title,
  ].filter(Boolean);
  const navItems = [
    ["hero", "Home"],
    ["about", "About"],
    ["skills", "Skills"],
    ["experience", "Journey"],
    ["projects", "Projects"],
    ["contact", "Contact"],
  ];

  return (
    <div
      ref={frameRef}
      className={`portfolio-frame ${data.theme.backgroundMode === "light" ? "theme-light" : "theme-dark"} ${
        preview ? "is-preview" : ""
      } ${data.theme.animationsEnabled ? "" : "animations-off"} ${
        data.theme.buttonStyle === "square" ? "buttons-square" : ""
      }`}
      style={themeStyle}
    >
      <div className="portfolio-noise" aria-hidden="true" />
      <header className="portfolio-topbar" data-reveal data-section-id="hero" id="hero">
        <a className="portfolio-brand" href="#hero">
          <span className="brand-mark">AK</span>
          <span className="brand-copy">
            <strong>{data.profile.name}</strong>
            <small>Portfolio System</small>
          </span>
        </a>
        <nav className="portfolio-nav" aria-label="Section navigation">
          {navItems.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={activeSection === id ? "is-active" : ""}>
              {label}
            </a>
          ))}
        </nav>
        <a className="topbar-cta" href="#contact">
          Hire Me
        </a>
      </header>

      <section className="portfolio-hero-panel" data-reveal>
        <div className="hero-copy">
          <p className="portfolio-kicker">Current Profile</p>
          <h1>{data.profile.name}</h1>
          <h2>{data.profile.headline}</h2>
          <p className="hero-summary">{data.profile.subheadline}</p>
          <p className="hero-detail">{aboutPreview}</p>
          <div className="hero-actions">
            <a className="primary-button portfolio-button" href="#projects">
              View Projects
            </a>
            <a className="secondary-button portfolio-button" href="#contact">
              Hire Me
            </a>
          </div>
          <div className="hero-highlights">
            {topHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="hero-image-frame">
            <div className="hero-image-grid" aria-hidden="true" />
            <img src={data.profile.image} alt={data.profile.name} className="portfolio-avatar" />
          </div>
        </div>
      </section>

      <section className="hero-stats-grid" data-reveal>
        {statTargets.map((item) => (
          <StatCounter
            key={item.label}
            label={item.label}
            value={item.value}
            suffix={item.suffix}
            enabled={!preview && data?.theme?.animationsEnabled !== false}
          />
        ))}
      </section>

      <section className="portfolio-section" id="about" data-section-id="about" data-reveal>
        <div className="portfolio-section-head">
          <div>
            <p className="portfolio-kicker">About</p>
            <h3>Professional Summary</h3>
          </div>
          <p className="section-copy">
            A practical business support profile combining accounting discipline, digital growth awareness, and hands-on
            execution for real clients.
          </p>
        </div>
        <div className="about-grid">
          <article className="portfolio-card about-story">
            <div dangerouslySetInnerHTML={{ __html: data.profile.aboutHtml }} />
          </article>
          <article className="portfolio-card highlight-card">
            <span className="detail-label">Focus Areas</span>
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

      <section className="portfolio-section" id="skills" data-section-id="skills" data-reveal>
        <div className="portfolio-section-head">
          <div>
            <p className="portfolio-kicker">Core Competencies</p>
            <h3>Multi-Skilled Capability Stack</h3>
          </div>
          <p className="section-copy">
            Structured across business operations, growth support, and technical execution so the portfolio feels like a
            complete professional system.
          </p>
        </div>
        <div className="skill-category-grid">
          {groupedSkills.map((group) => (
            <article key={group.category} className="skill-category-card">
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

      <section className="portfolio-section" id="experience" data-section-id="experience" data-reveal>
        <div className="portfolio-section-head">
          <div>
            <p className="portfolio-kicker">Professional Journey</p>
            <h3>Experience That Connects Accuracy With Growth</h3>
          </div>
          <p className="section-copy">
            From day-to-day financial handling to practical digital execution, the timeline reflects reliable, adaptable
            business support.
          </p>
        </div>
        <div className="journey-layout">
          <div className="timeline-stack">
            {data.experiences.map((item, index) => (
              <article key={item.id} className="timeline-card">
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
            <article className="portfolio-card journey-note">
              <span className="detail-label">Working Style</span>
              <strong>Process-minded, calm under pressure, and focused on useful outcomes.</strong>
              <p>
                The strongest value here is not just skill range, but the ability to connect records, communication,
                reporting, and digital presentation into one dependable workflow.
              </p>
            </article>
            <article className="portfolio-card journey-note">
              <span className="detail-label">Recognition</span>
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

      <section className="portfolio-section" id="projects" data-section-id="projects" data-reveal>
        <div className="portfolio-section-head">
          <div>
            <p className="portfolio-kicker">Featured Projects</p>
            <h3>Execution That Looks Polished And Business-Ready</h3>
          </div>
          <p className="section-copy">
            Selected work presented in a premium product-style layout, combining clean structure, clarity, and
            conversion-oriented design.
          </p>
        </div>
        <div className="projects-showcase">
          {featuredProject ? (
            <article className="featured-project-card">
              {featuredProject.image ? (
                <div className="featured-project-media">
                  <img src={featuredProject.image} alt={featuredProject.title} className="project-image" />
                </div>
              ) : null}
              <div className="featured-project-copy">
                <div className="tag-row">
                  {(featuredProject.tags || []).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <strong>{featuredProject.title}</strong>
                <p>{featuredProject.description}</p>
                {featuredProject.liveLink ? (
                  <a className="primary-button portfolio-button" href={featuredProject.liveLink} target="_blank" rel="noreferrer">
                    View Live Site
                  </a>
                ) : null}
              </div>
            </article>
          ) : (
            <article className="featured-project-card empty-project-card">
              <strong>No featured project yet</strong>
              <p>Add a project from the admin panel to populate this showcase.</p>
            </article>
          )}

          <div className="project-side-stack">
            {projectSidePanels.map((panel) => (
              <article key={panel.category} className="project-side-card">
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
      </section>

      <section className="portfolio-section" id="achievements" data-section-id="achievements" data-reveal>
        <div className="portfolio-section-head">
          <div>
            <p className="portfolio-kicker">Achievements</p>
            <h3>Recognition And Learning Milestones</h3>
          </div>
          <p className="section-copy">
            Proof of consistency, curiosity, and the ability to keep growing across business, tools, and execution.
          </p>
        </div>
        <div className="achievement-grid">
          {data.achievements.map((item) => (
            <article key={item.id} className="achievement-card">
              <span className="icon-pill">{achievementLabels[item.icon] || "Badge"}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section" id="contact" data-section-id="contact" data-reveal>
        <article className="contact-copy contact-copy-wide contact-showcase">
          <div className="contact-glow-orb contact-glow-orb-one" aria-hidden="true" />
          <div className="contact-glow-orb contact-glow-orb-two" aria-hidden="true" />

          <div className="contact-showcase-copy">
            <p className="portfolio-kicker">{contactSettings.kicker}</p>
            <div className="contact-signal">
              <span className="contact-signal-dot" />
              <span>{contactSettings.availability}</span>
            </div>
            <h3 dangerouslySetInnerHTML={{ __html: contactSettings.title }} />
            <p>{contactSettings.description}</p>
          </div>

          <div className="contact-channel-grid">
            <a className="contact-channel-card" href={`mailto:${data.settings.email}`}>
              <span className="contact-channel-label">Email</span>
              <strong>{data.settings.email}</strong>
              <small>Best for project discussion and formal communication.</small>
            </a>
            <a className="contact-channel-card" href={`tel:${data.settings.phone.replace(/\s+/g, "")}`}>
              <span className="contact-channel-label">Phone</span>
              <strong>{data.settings.phone}</strong>
              <small>Direct call for quick coordination.</small>
            </a>
            <a className="contact-channel-card contact-channel-card-accent" href={data.settings.whatsappLink} target="_blank" rel="noreferrer">
              <span className="contact-channel-label">WhatsApp</span>
              <strong>Start Instant Chat</strong>
              <small>Fastest way to reach out for freelance or client work.</small>
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

      <footer className="portfolio-footer" data-reveal>
        <div>
          <strong>{data.profile.name}</strong>
          <p>{data.profile.headline}</p>
        </div>
        <span>{data.settings.seoTitle}</span>
      </footer>

      <a className="portfolio-whatsapp" href={data.settings.whatsappLink} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </div>
  );
}
