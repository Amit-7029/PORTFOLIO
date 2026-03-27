import React, { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const iconMap = {
  award: "Award",
  certificate: "Certificate",
  star: "Star",
  bolt: "Bolt",
};

export default function PortfolioView({ data, preview = false }) {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const groupedSkills = useMemo(() => {
    if (!data?.skills) return {};
    return data.skills.reduce((acc, skill) => {
      acc[skill.category] = acc[skill.category] || [];
      acc[skill.category].push(skill);
      return acc;
    }, {});
  }, [data]);

  if (!data) {
    return <div className="empty-state">Loading portfolio...</div>;
  }

  async function submitMessage(event) {
    event.preventDefault();
    setSending(true);
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(contactForm),
      });
      setContactForm({ name: "", email: "", message: "" });
    } finally {
      setSending(false);
    }
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

  return (
    <div
      className={`portfolio-frame ${data.theme.backgroundMode === "light" ? "theme-light" : "theme-dark"} ${
        preview ? "is-preview" : ""
      } ${data.theme.animationsEnabled ? "" : "animations-off"} ${
        data.theme.buttonStyle === "square" ? "buttons-square" : ""
      }`}
      style={themeStyle}
    >
      <section className="portfolio-hero">
        <div>
          <p className="portfolio-kicker">Portfolio</p>
          <h1>{data.profile.name}</h1>
          <h2>{data.profile.headline}</h2>
          <p>{data.profile.subheadline}</p>
        </div>
        <img src={data.profile.image} alt={data.profile.name} className="portfolio-avatar" />
      </section>

      <section className="portfolio-section">
        <div className="portfolio-section-head">
          <p className="portfolio-kicker">About</p>
          <h3>Profile Summary</h3>
        </div>
        <div dangerouslySetInnerHTML={{ __html: data.profile.aboutHtml }} />
      </section>

      <section className="portfolio-section">
        <div className="portfolio-section-head">
          <p className="portfolio-kicker">Skills</p>
          <h3>Category Overview</h3>
        </div>
        <div className="preview-grid two-up">
          {Object.entries(groupedSkills).map(([category, items]) => (
            <article key={category} className="preview-card">
              <strong>{category}</strong>
              <div className="skill-bars">
                {items.map((skill) => (
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

      <section className="portfolio-section">
        <div className="portfolio-section-head">
          <p className="portfolio-kicker">Experience</p>
          <h3>Timeline</h3>
        </div>
        <div className="timeline-list">
          {data.experiences.map((item) => (
            <article key={item.id} className="timeline-card">
              <small>{item.duration}</small>
              <strong>{item.role}</strong>
              <span>{item.company}</span>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section">
        <div className="portfolio-section-head">
          <p className="portfolio-kicker">Projects</p>
          <h3>Selected Work</h3>
        </div>
        <div className="preview-grid">
          {data.projects.map((project) => (
            <article key={project.id} className="preview-card project-preview-card">
              {project.image ? <img src={project.image} alt={project.title} className="project-image" /> : null}
              <strong>{project.title}</strong>
              <p>{project.description}</p>
              <div className="tag-row">
                {project.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section">
        <div className="portfolio-section-head">
          <p className="portfolio-kicker">Achievements</p>
          <h3>Highlights</h3>
        </div>
        <div className="preview-grid three-up">
          {data.achievements.map((item) => (
            <article key={item.id} className="preview-card">
              <span className="icon-pill">{iconMap[item.icon] || "Badge"}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section">
        <div className="portfolio-section-head">
          <p className="portfolio-kicker">Contact</p>
          <h3>Reach Out</h3>
        </div>
        <div className="preview-grid two-up">
          <article className="preview-card">
            <strong>{data.settings.email}</strong>
            <p>{data.settings.phone}</p>
            <a href={data.settings.whatsappLink} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </article>
          {!preview ? (
            <form className="public-contact-form" onSubmit={submitMessage}>
              <input
                placeholder="Name"
                value={contactForm.name}
                onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                placeholder="Email"
                type="email"
                value={contactForm.email}
                onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <textarea
                placeholder="Message"
                value={contactForm.message}
                onChange={(event) => setContactForm((current) => ({ ...current, message: event.target.value }))}
                required
              />
              <button type="submit" className="primary-button">
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          ) : (
            <article className="preview-card">
              <strong>Live Preview Active</strong>
              <p>Changes from the admin editor appear here instantly before publishing.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
