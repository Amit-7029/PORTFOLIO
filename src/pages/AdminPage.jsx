import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import PortfolioView from "../components/PortfolioView";
import RichTextEditor from "../components/RichTextEditor";
import { useToast } from "../components/ToastProvider";
import { usePortfolio } from "../context/PortfolioContext";
import { apiFetch } from "../lib/api";

const sections = [
  "dashboard",
  "profile",
  "theme",
  "site",
  "content",
  "services",
  "skills",
  "projects",
  "experience",
  "achievements",
  "media",
  "messages",
  "settings",
];

const iconOptions = ["award", "certificate", "star", "bolt"];
const cmsSectionKeys = ["hero", "about", "services", "skills", "experience", "projects", "achievements", "contact", "footer"];
const staticMediaOptions = [
  { value: "/media/ai-tools-showcase.png", label: "ai-tools-showcase.png" },
  { value: "/media/meta-showcase.webp", label: "meta-showcase.webp" },
  { value: "/media/web-dev-showcase-1.png", label: "web-dev-showcase-1.png" },
  { value: "/media/web-dev-showcase-2.jpg", label: "web-dev-showcase-2.jpg" },
];

const contentFieldMap = {
  hero: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "introLabel", label: "Intro Label" },
    { key: "kicker", label: "Kicker" },
    { key: "description", label: "Detail Text", type: "textarea" },
    { key: "primaryButtonText", label: "Primary Button Text" },
    { key: "primaryButtonLink", label: "Primary Button Link" },
    { key: "secondaryButtonText", label: "Secondary Button Text" },
    { key: "secondaryButtonLink", label: "Secondary Button Link" },
    { key: "scrollLabel", label: "Scroll Label" },
    { key: "overlayImages", label: "Overlay Images", type: "media-list" },
    { key: "overlayOpacity", label: "Overlay Opacity", type: "number" },
    { key: "highlightItems", label: "Highlight Items", type: "list" },
    { key: "statsItems", label: "Hero Stats", type: "stats-list" },
  ],
  about: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "highlightLabel", label: "Highlight Label" },
  ],
  services: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  skills: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  experience: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  projects: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "projectEyebrow", label: "Project Eyebrow" },
    { key: "visualPrimaryImage", label: "Primary Visual Image", type: "media-select" },
    { key: "visualPrimaryLabel", label: "Primary Visual Label" },
    { key: "visualPrimaryTitle", label: "Primary Visual Title" },
    { key: "visualSecondaryImage", label: "Secondary Visual Image", type: "media-select" },
    { key: "visualSecondaryLabel", label: "Secondary Visual Label" },
    { key: "visualSecondaryTitle", label: "Secondary Visual Title" },
  ],
  achievements: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  contact: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "kicker", label: "Kicker" },
    { key: "availability", label: "Availability" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "emailLabel", label: "Email Label" },
    { key: "emailHint", label: "Email Hint", type: "textarea" },
    { key: "phoneLabel", label: "Phone Label" },
    { key: "phoneHint", label: "Phone Hint", type: "textarea" },
    { key: "whatsappLabel", label: "WhatsApp Label" },
    { key: "whatsappTitle", label: "WhatsApp Title" },
    { key: "whatsappHint", label: "WhatsApp Hint", type: "textarea" },
    { key: "formSubject", label: "Form Subject" },
    { key: "formNameLabel", label: "Form Name Label" },
    { key: "formNamePlaceholder", label: "Form Name Placeholder" },
    { key: "formEmailLabel", label: "Form Email Label" },
    { key: "formEmailPlaceholder", label: "Form Email Placeholder" },
    { key: "formMessageLabel", label: "Form Message Label" },
    { key: "formMessagePlaceholder", label: "Form Message Placeholder", type: "textarea" },
    { key: "formButtonText", label: "Form Button Text" },
  ],
  footer: [
    { key: "visible", label: "Visible", type: "toggle" },
    { key: "navLabel", label: "Nav Label" },
    { key: "seoFallback", label: "Footer Text" },
  ],
};

function createEmpty(section) {
  switch (section) {
    case "services":
      return { title: "", description: "" };
    case "skills":
      return { category: "Marketing", name: "", level: 50 };
    case "projects":
      return { title: "", description: "", image: "", liveLink: "", tags: [], featured: false };
    case "experiences":
      return { role: "", company: "", duration: "", description: "" };
    case "achievements":
      return { title: "", description: "", icon: "award" };
    default:
      return {};
  }
}

export default function AdminPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { portfolio, setPortfolio, loadAdminContent, logout } = usePortfolio();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [draft, setDraft] = useState(null);
  const [stats, setStats] = useState(null);
  const [media, setMedia] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState(null);

  useEffect(() => {
    async function init() {
      const data = await loadAdminContent();
      setDraft(data);
      setPortfolio(data);
      const [dashboard, mediaItems, messageItems] = await Promise.all([
        apiFetch("/api/dashboard/stats"),
        apiFetch("/api/media"),
        apiFetch("/api/messages"),
      ]);
      setStats(dashboard);
      setMedia(mediaItems);
      setMessages(messageItems);
    }
    init();
  }, []);

  useEffect(() => {
    if (portfolio) setDraft(portfolio);
  }, [portfolio]);

  const messageCount = messages.length;

  function updateDraft(path, value) {
    setDraft((current) => ({ ...current, [path]: { ...current[path], ...value } }));
  }

  function updateSectionDraft(sectionKey, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: {
          ...current.sections[sectionKey],
          ...value,
        },
      },
    }));
  }

  function updateSiteConfig(value) {
    setDraft((current) => ({
      ...current,
      siteConfig: {
        ...current.siteConfig,
        ...value,
      },
    }));
  }

  async function persist(path, payload) {
    const data = await apiFetch(`/api/${path}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setDraft((current) => ({ ...current, [path]: data }));
    setPortfolio((current) => ({ ...current, [path]: data }));
    const dashboard = await apiFetch("/api/dashboard/stats");
    setStats(dashboard);
    toast({ title: "Saved", message: `${path} updated successfully.`, type: "success" });
  }

  async function persistMapped(path, stateKey, payload) {
    const data = await apiFetch(`/api/${path}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setDraft((current) => ({ ...current, [stateKey]: data }));
    setPortfolio((current) => ({ ...current, [stateKey]: data }));
    const dashboard = await apiFetch("/api/dashboard/stats");
    setStats(dashboard);
    toast({ title: "Saved", message: `${stateKey} updated successfully.`, type: "success" });
  }

  async function saveListItem(key, item) {
    const isDraft = !item.id || item.id.startsWith("draft_");
    const method = isDraft ? "POST" : "PUT";
    const url = isDraft ? `/api/${key}` : `/api/${key}/${item.id}`;
    const payload = { ...item };
    delete payload.id;
    const saved = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
    setDraft((current) => {
      const list =
        method === "POST"
          ? [...current[key].filter((entry) => entry.id !== item.id), saved]
          : current[key].map((entry) => (entry.id === saved.id ? saved : entry));
      const next = { ...current, [key]: list };
      setPortfolio(next);
      return next;
    });
    const dashboard = await apiFetch("/api/dashboard/stats");
    setStats(dashboard);
    toast({ title: "Saved", message: `${key.slice(0, -1)} updated.`, type: "success" });
  }

  function updateListItem(key, id, field, value) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  }

  function addListItem(key) {
    setDraft((current) => ({
      ...current,
      [key]: [...current[key], { id: `draft_${Math.random()}`, ...createEmpty(key) }],
    }));
  }

  async function confirmDelete() {
    const { key, id } = pendingDelete;
    await apiFetch(`/api/${key}/${id}`, { method: "DELETE" });
    if (key === "messages") {
      const next = messages.filter((item) => item.id !== id);
      setMessages(next);
    } else if (key === "media") {
      setMedia((current) => current.filter((item) => item.id !== id));
    } else {
      setDraft((current) => {
        const next = { ...current, [key]: current[key].filter((item) => item.id !== id) };
        setPortfolio(next);
        return next;
      });
    }
    setPendingDelete(null);
    const dashboard = await apiFetch("/api/dashboard/stats");
    setStats(dashboard);
    toast({ title: "Deleted", message: "Item removed successfully.", type: "success" });
  }

  async function handleUpload(file) {
    const formData = new FormData();
    formData.append("file", file);
    const uploaded = await apiFetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    setMedia((current) => [uploaded, ...current]);
    toast({ title: "Uploaded", message: "Media uploaded successfully.", type: "success" });
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login");
  }

  function moveSection(sectionKey, targetIndex) {
    setDraft((current) => {
      const order = [...(current.siteConfig?.sectionOrder || cmsSectionKeys)];
      const sourceIndex = order.indexOf(sectionKey);
      if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= order.length) {
        return current;
      }
      order.splice(sourceIndex, 1);
      order.splice(targetIndex, 0, sectionKey);
      return {
        ...current,
        siteConfig: {
          ...current.siteConfig,
          sectionOrder: order,
        },
      };
    });
  }

  const cards = useMemo(
    () => [
      { label: "Total Projects", value: stats?.totalProjects ?? 0 },
      { label: "Skills Count", value: stats?.skillsCount ?? 0 },
      { label: "Messages Received", value: messageCount },
      { label: "Last Updated", value: stats?.lastUpdatedTime ? new Date(stats.lastUpdatedTime).toLocaleString() : "-" },
    ],
    [stats, messageCount],
  );

  if (!draft) {
    return <div className="screen-center">Loading admin...</div>;
  }

  function renderDynamicField(sectionKey, field) {
    const value = draft.sections?.[sectionKey]?.[field.key];

    if (field.type === "toggle") {
      return (
        <label key={field.key} className="toggle-field">
          {field.label}
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateSectionDraft(sectionKey, { [field.key]: event.target.checked })}
          />
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <label key={field.key} className="full-span">
          {field.label}
          <textarea value={value || ""} onChange={(event) => updateSectionDraft(sectionKey, { [field.key]: event.target.value })} />
        </label>
      );
    }

    if (field.type === "list") {
      return (
        <label key={field.key} className="full-span">
          {field.label}
          <input
            value={Array.isArray(value) ? value.join(", ") : ""}
            onChange={(event) =>
              updateSectionDraft(sectionKey, {
                [field.key]: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      );
    }

    if (field.type === "stats-list") {
      return (
        <label key={field.key} className="full-span">
          {field.label}
          <textarea
            value={(Array.isArray(value) ? value : [])
              .map((item) => `${item.value || ""}${item.suffix || ""} | ${item.label || ""}`)
              .join("\n")}
            onChange={(event) =>
              updateSectionDraft(sectionKey, {
                [field.key]: event.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [rawValue = "", rawLabel = ""] = line.split("|").map((item) => item.trim());
                    const match = rawValue.match(/^(\d+)(.*)$/);
                    return {
                      value: match?.[1] || rawValue,
                      suffix: match?.[2] || "",
                      label: rawLabel,
                    };
                  }),
              })
            }
            placeholder={"2+ | Experience\n8+ | Projects\n12+ | Technologies\n4+ | Clients"}
          />
        </label>
      );
    }

    if (field.type === "media-select") {
      const mediaOptions = [...staticMediaOptions, ...media.map((mediaItem) => ({ value: mediaItem.url, label: mediaItem.name }))]
        .filter((item, index, list) => item.value && list.findIndex((candidate) => candidate.value === item.value) === index);

      return (
        <label key={field.key} className="full-span">
          {field.label}
          <select value={value || ""} onChange={(event) => updateSectionDraft(sectionKey, { [field.key]: event.target.value })}>
            <option value="">No image</option>
            {mediaOptions.map((mediaItem) => (
              <option key={mediaItem.value} value={mediaItem.value}>
                {mediaItem.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "media-list") {
      const mediaOptions = [...staticMediaOptions, ...media.map((mediaItem) => ({ value: mediaItem.url, label: mediaItem.name }))]
        .filter((item, index, list) => item.value && list.findIndex((candidate) => candidate.value === item.value) === index);

      const currentValues = Array.isArray(value) ? value : [];

      return (
        <label key={field.key} className="full-span">
          {field.label}
          <textarea
            value={currentValues.join("\n")}
            onChange={(event) =>
              updateSectionDraft(sectionKey, {
                [field.key]: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder="/media/ai-tools-showcase.png&#10;/media/meta-showcase.webp"
          />
          <select
            value=""
            onChange={(event) => {
              const nextValue = event.target.value;
              if (!nextValue) return;
              updateSectionDraft(sectionKey, {
                [field.key]: [...currentValues, nextValue].filter((item, index, list) => list.indexOf(item) === index),
              });
              event.target.value = "";
            }}
          >
            <option value="">Add image from media library</option>
            {mediaOptions.map((mediaItem) => (
              <option key={mediaItem.value} value={mediaItem.value}>
                {mediaItem.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "number") {
      return (
        <label key={field.key}>
          {field.label}
          <input
            type="number"
            min="0"
            max="100"
            value={value ?? 44}
            onChange={(event) => updateSectionDraft(sectionKey, { [field.key]: Number(event.target.value) })}
          />
        </label>
      );
    }

    return (
      <label key={field.key} className={field.key.toLowerCase().includes("link") ? "full-span" : ""}>
        {field.label}
        <input value={value || ""} onChange={(event) => updateSectionDraft(sectionKey, { [field.key]: event.target.value })} />
      </label>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="editor-stack">
            <section className="admin-panel">
              <div className="panel-head">
                <div>
                  <p className="section-label">Overview</p>
                  <h2>Dashboard Overview</h2>
                </div>
                <div className="quick-actions">
                  <button className="primary-button" onClick={() => setActiveSection("projects")}>Add Project</button>
                  <button className="secondary-button" onClick={() => setActiveSection("profile")}>Update Profile</button>
                </div>
              </div>
              <div className="metric-grid">
                {cards.map((card) => (
                  <article key={card.label} className="metric-card">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </article>
                ))}
              </div>
            </section>
          </div>
        );
      case "profile":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Profile</p><h2>Profile Manager</h2></div></div>
            <div className="form-grid">
              <label>Name<input value={draft.profile.name} onChange={(e) => updateDraft("profile", { name: e.target.value })} /></label>
              <label>Headline<input value={draft.profile.headline} onChange={(e) => updateDraft("profile", { headline: e.target.value })} /></label>
              <label className="full-span">Subheadline<input value={draft.profile.subheadline} onChange={(e) => updateDraft("profile", { subheadline: e.target.value })} /></label>
              <label className="full-span">Profile Image
                <select value={draft.profile.image} onChange={(e) => updateDraft("profile", { image: e.target.value })}>
                  {media.map((item) => <option key={item.id} value={item.url}>{item.name}</option>)}
                </select>
              </label>
              <div className="full-span">
                <span className="field-label">About</span>
                <RichTextEditor value={draft.profile.aboutHtml} onChange={(value) => updateDraft("profile", { aboutHtml: value })} />
              </div>
            </div>
            <div className="panel-actions">
              <button className="primary-button" onClick={() => persist("profile", draft.profile)}>Save Profile</button>
            </div>
          </section>
        );
      case "theme":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Design</p><h2>Theme Controls</h2></div></div>
            <div className="form-grid">
              <label>Primary Color<input type="color" value={draft.theme.primaryColor} onChange={(e) => updateDraft("theme", { primaryColor: e.target.value })} /></label>
              <label>Secondary Color<input type="color" value={draft.theme.secondaryColor} onChange={(e) => updateDraft("theme", { secondaryColor: e.target.value })} /></label>
              <label>Glow Color<input type="color" value={draft.theme.glowColor || draft.theme.primaryColor} onChange={(e) => updateDraft("theme", { glowColor: e.target.value })} /></label>
              <label>Background Mode
                <select value={draft.theme.backgroundMode} onChange={(e) => updateDraft("theme", { backgroundMode: e.target.value })}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label>Background Color<input type="color" value={draft.theme.backgroundColor} onChange={(e) => updateDraft("theme", { backgroundColor: e.target.value })} /></label>
              <label>Text Color<input type="color" value={draft.theme.textColor || "#f6f7fb"} onChange={(e) => updateDraft("theme", { textColor: e.target.value })} /></label>
              <label>Muted Text Color<input type="color" value={draft.theme.mutedTextColor || "#91a1bf"} onChange={(e) => updateDraft("theme", { mutedTextColor: e.target.value })} /></label>
              <label>Font Family
                <select value={draft.theme.fontFamily} onChange={(e) => updateDraft("theme", { fontFamily: e.target.value })}>
                  <option value="Inter">Inter</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </label>
              <label>Surface Color<input value={draft.theme.surfaceColor || "rgba(10, 16, 28, 0.76)"} onChange={(e) => updateDraft("theme", { surfaceColor: e.target.value })} /></label>
              <label>Border Color<input value={draft.theme.borderColor || "rgba(255, 255, 255, 0.08)"} onChange={(e) => updateDraft("theme", { borderColor: e.target.value })} /></label>
              <label>Button Style
                <select value={draft.theme.buttonStyle} onChange={(e) => updateDraft("theme", { buttonStyle: e.target.value })}>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                </select>
              </label>
              <label>Section Padding
                <input type="number" value={draft.theme.sectionPadding || 28} onChange={(e) => updateDraft("theme", { sectionPadding: Number(e.target.value) || 0 })} />
              </label>
              <label>Card Radius
                <input type="number" value={draft.theme.cardRadius || 30} onChange={(e) => updateDraft("theme", { cardRadius: Number(e.target.value) || 0 })} />
              </label>
              <label>Body Scale
                <input type="number" step="0.05" value={draft.theme.bodyScale || 1} onChange={(e) => updateDraft("theme", { bodyScale: Number(e.target.value) || 1 })} />
              </label>
              <label>Heading Scale
                <input type="number" step="0.05" value={draft.theme.headingScale || 1} onChange={(e) => updateDraft("theme", { headingScale: Number(e.target.value) || 1 })} />
              </label>
              <label>Animation Speed
                <select value={draft.theme.animationSpeed || "medium"} onChange={(e) => updateDraft("theme", { animationSpeed: e.target.value })}>
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
              <label>Animation Intensity
                <select value={draft.theme.animationIntensity || "high"} onChange={(e) => updateDraft("theme", { animationIntensity: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>Glow Intensity
                <select value={draft.theme.glowIntensity || "high"} onChange={(e) => updateDraft("theme", { glowIntensity: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="toggle-field">Animations
                <input type="checkbox" checked={draft.theme.animationsEnabled} onChange={(e) => updateDraft("theme", { animationsEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Hero Intro
                <input type="checkbox" checked={draft.theme.introAnimationEnabled ?? true} onChange={(e) => updateDraft("theme", { introAnimationEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Parallax
                <input type="checkbox" checked={draft.theme.parallaxEnabled ?? true} onChange={(e) => updateDraft("theme", { parallaxEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Glow Effects
                <input type="checkbox" checked={draft.theme.glowEnabled ?? true} onChange={(e) => updateDraft("theme", { glowEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Background Effects
                <input type="checkbox" checked={draft.theme.backgroundEffectsEnabled ?? true} onChange={(e) => updateDraft("theme", { backgroundEffectsEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Scroll Animations
                <input type="checkbox" checked={draft.theme.scrollAnimationsEnabled ?? true} onChange={(e) => updateDraft("theme", { scrollAnimationsEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Image Zoom Intro
                <input type="checkbox" checked={draft.theme.imageZoomEnabled ?? true} onChange={(e) => updateDraft("theme", { imageZoomEnabled: e.target.checked })} />
              </label>
              <label className="toggle-field">Slider Autoplay
                <input type="checkbox" checked={draft.theme.sliderAutoplayEnabled ?? true} onChange={(e) => updateDraft("theme", { sliderAutoplayEnabled: e.target.checked })} />
              </label>
            </div>
            <div className="panel-actions">
              <button className="primary-button" onClick={() => persist("theme", draft.theme)}>Save Theme</button>
            </div>
          </section>
        );
      case "site":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Site Builder</p><h2>Navigation, Layout & Order</h2></div></div>
            <div className="form-grid">
              <label className="toggle-field">Show Navbar Brand
                <input type="checkbox" checked={draft.siteConfig.showBrand ?? false} onChange={(e) => updateSiteConfig({ showBrand: e.target.checked })} />
              </label>
              <label>Brand Mark<input value={draft.siteConfig.brandMark || ""} onChange={(e) => updateSiteConfig({ brandMark: e.target.value })} /></label>
              <label>Brand Subtitle<input value={draft.siteConfig.brandSubtitle || ""} onChange={(e) => updateSiteConfig({ brandSubtitle: e.target.value })} /></label>
              <label>Primary Nav Button Text<input value={draft.siteConfig.primaryNavButtonText || ""} onChange={(e) => updateSiteConfig({ primaryNavButtonText: e.target.value })} /></label>
              <label>Primary Nav Button Link<input value={draft.siteConfig.primaryNavButtonLink || ""} onChange={(e) => updateSiteConfig({ primaryNavButtonLink: e.target.value })} /></label>
              <label>Section Heading Align
                <select value={draft.siteConfig.sectionHeadingAlign || "center"} onChange={(e) => updateSiteConfig({ sectionHeadingAlign: e.target.value })}>
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </label>
            </div>
            <div className="stack-list" style={{ marginTop: "20px" }}>
              {(draft.siteConfig.sectionOrder || cmsSectionKeys).map((sectionKey, index) => (
                <article
                  key={sectionKey}
                  className="editor-card"
                  draggable
                  onDragStart={() => setDraggedSectionId(sectionKey)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedSectionId || draggedSectionId === sectionKey) return;
                    const targetIndex = (draft.siteConfig.sectionOrder || cmsSectionKeys).indexOf(sectionKey);
                    moveSection(draggedSectionId, targetIndex);
                    setDraggedSectionId(null);
                  }}
                  onDragEnd={() => setDraggedSectionId(null)}
                >
                  <div className="panel-head" style={{ marginBottom: 0 }}>
                    <div>
                      <p className="section-label">{`Section ${String(index + 1).padStart(2, "0")}`}</p>
                      <h2 style={{ fontSize: "1.1rem" }}>{sectionKey}</h2>
                    </div>
                    <div className="quick-actions">
                      <button type="button" className="ghost-button" onClick={() => moveSection(sectionKey, index - 1)}>Up</button>
                      <button type="button" className="ghost-button" onClick={() => moveSection(sectionKey, index + 1)}>Down</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="panel-actions">
              <button className="primary-button" onClick={() => persistMapped("site-config", "siteConfig", draft.siteConfig)}>Save Site Config</button>
            </div>
          </section>
        );
      case "content":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Content</p><h2>All Section Content</h2></div></div>
            <div className="stack-list">
              {(draft.siteConfig.sectionOrder || cmsSectionKeys).map((sectionKey) => (
                <article key={sectionKey} className="editor-card">
                  <div className="panel-head">
                    <div>
                      <p className="section-label">Section</p>
                      <h2 style={{ fontSize: "1.15rem" }}>{sectionKey}</h2>
                    </div>
                  </div>
                  <div className="form-grid">
                    {(contentFieldMap[sectionKey] || []).map((field) => renderDynamicField(sectionKey, field))}
                  </div>
                </article>
              ))}
            </div>
            <div className="panel-actions">
              <button className="primary-button" onClick={() => persistMapped("sections", "sections", draft.sections)}>Save Section Content</button>
            </div>
          </section>
        );
      case "services":
        return renderListSection("services", draft.services, ["title", "description"]);
      case "skills":
        return renderListSection("skills", draft.skills, ["category", "name", "level"]);
      case "projects":
        return renderListSection("projects", draft.projects, ["title", "description", "image", "liveLink", "tags", "featured"]);
      case "experience":
        return renderListSection("experiences", draft.experiences, ["role", "company", "duration", "description"]);
      case "achievements":
        return renderListSection("achievements", draft.achievements, ["title", "description", "icon"]);
      case "media":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Media</p><h2>Image Manager</h2></div></div>
            <div
              className={`upload-dropzone ${dragging ? "is-dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
            >
              <strong>Drag and drop image here</strong>
              <span>or</span>
              <label className="secondary-button">
                Choose file
                <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            </div>
            <div className="media-grid">
              {media.map((item) => (
                <article key={item.id} className="media-card">
                  <img src={item.url} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <button className="ghost-button" onClick={() => setPendingDelete({ key: "media", id: item.id })}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      case "messages":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Inbox</p><h2>Messages</h2></div></div>
            <div className="table-shell">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Action</th></tr></thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id}>
                      <td>{message.name}</td>
                      <td>{message.email}</td>
                      <td>{message.message}</td>
                      <td><button className="ghost-button" onClick={() => setPendingDelete({ key: "messages", id: message.id })}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      case "settings":
        return (
          <section className="admin-panel">
            <div className="panel-head"><div><p className="section-label">Settings</p><h2>Contact & SEO</h2></div></div>
            <div className="form-grid">
              <label>Phone<input value={draft.settings.phone} onChange={(e) => updateDraft("settings", { phone: e.target.value })} /></label>
              <label>Email<input value={draft.settings.email} onChange={(e) => updateDraft("settings", { email: e.target.value })} /></label>
              <label className="full-span">WhatsApp Link<input value={draft.settings.whatsappLink} onChange={(e) => updateDraft("settings", { whatsappLink: e.target.value })} /></label>
              <label>LinkedIn Link<input value={draft.settings.linkedinLink || ""} onChange={(e) => updateDraft("settings", { linkedinLink: e.target.value })} /></label>
              <label>GitHub Link<input value={draft.settings.githubLink || ""} onChange={(e) => updateDraft("settings", { githubLink: e.target.value })} /></label>
              <label>Contact Kicker<input value={draft.settings.contactKicker || ""} onChange={(e) => updateDraft("settings", { contactKicker: e.target.value })} /></label>
              <label>Availability Line<input value={draft.settings.contactAvailability || ""} onChange={(e) => updateDraft("settings", { contactAvailability: e.target.value })} /></label>
              <label className="full-span">Contact Title<input value={draft.settings.contactTitle || ""} onChange={(e) => updateDraft("settings", { contactTitle: e.target.value })} /></label>
              <label className="full-span">Contact Description<textarea value={draft.settings.contactDescription || ""} onChange={(e) => updateDraft("settings", { contactDescription: e.target.value })} /></label>
              <label className="full-span">Meta Title<input value={draft.settings.seoTitle} onChange={(e) => updateDraft("settings", { seoTitle: e.target.value })} /></label>
              <label className="full-span">Meta Description<textarea value={draft.settings.seoDescription} onChange={(e) => updateDraft("settings", { seoDescription: e.target.value })} /></label>
              <label className="full-span">Keywords<input value={draft.settings.seoKeywords} onChange={(e) => updateDraft("settings", { seoKeywords: e.target.value })} /></label>
            </div>
            <div className="panel-actions">
              <button className="primary-button" onClick={() => persist("settings", draft.settings)}>Save Settings</button>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  function renderListSection(key, items, fields) {
    return (
      <section className="admin-panel">
        <div className="panel-head">
          <div>
            <p className="section-label">{key}</p>
            <h2>{key.charAt(0).toUpperCase() + key.slice(1)} Manager</h2>
          </div>
          <button className="secondary-button" onClick={() => addListItem(key)}>Add New</button>
        </div>
        <div className="stack-list">
          {items.map((item) => (
            <article key={item.id} className="editor-card">
              <div className="form-grid">
                {fields.map((field) => {
                  if (field === "description") {
                    return (
                      <label key={field} className="full-span">
                        {field}
                        <textarea value={item[field] || ""} onChange={(e) => updateListItem(key, item.id, field, e.target.value)} />
                      </label>
                    );
                  }
                  if (field === "category") {
                    return (
                      <label key={field}>
                        Category
                        <select value={item.category} onChange={(e) => updateListItem(key, item.id, field, e.target.value)}>
                          <option>Marketing</option>
                          <option>Tech</option>
                          <option>Analytics</option>
                          <option>AI Tools</option>
                        </select>
                      </label>
                    );
                  }
                  if (field === "icon") {
                    return (
                      <label key={field}>
                        Icon
                        <select value={item.icon || "award"} onChange={(e) => updateListItem(key, item.id, field, e.target.value)}>
                          {iconOptions.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </label>
                    );
                  }
                  if (field === "image") {
                    return (
                      <label key={field}>
                        Image
                        <select value={item.image || ""} onChange={(e) => updateListItem(key, item.id, field, e.target.value)}>
                          <option value="">No image</option>
                          {media.map((mediaItem) => <option key={mediaItem.id} value={mediaItem.url}>{mediaItem.name}</option>)}
                        </select>
                      </label>
                    );
                  }
                  if (field === "tags") {
                    return (
                      <label key={field} className="full-span">
                        Tags
                        <input
                          value={(item.tags || []).join(", ")}
                          onChange={(e) => updateListItem(key, item.id, field, e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))}
                        />
                      </label>
                    );
                  }
                  if (field === "featured") {
                    return (
                      <label key={field} className="toggle-field">
                        Featured
                        <input type="checkbox" checked={Boolean(item.featured)} onChange={(e) => updateListItem(key, item.id, field, e.target.checked)} />
                      </label>
                    );
                  }
                  return (
                    <label key={field}>
                      {field}
                      <input
                        type={field === "level" ? "number" : "text"}
                        value={item[field] || ""}
                        onChange={(e) => updateListItem(key, item.id, field, field === "level" ? Number(e.target.value) : e.target.value)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="panel-actions">
                <button className="primary-button" onClick={() => saveListItem(key, item)}>Save</button>
                {item.id && !item.id.startsWith("draft_") ? (
                  <button className="ghost-button" onClick={() => setPendingDelete({ key, id: item.id })}>Delete</button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div>
            <p className="section-label">Mini CMS</p>
            <h1>Portfolio Control</h1>
          </div>
          <nav>
            {sections.map((section) => (
              <button
                key={section}
                className={`sidebar-link ${activeSection === section ? "is-active" : ""}`}
                onClick={() => setActiveSection(section)}
              >
                {section}
              </button>
            ))}
          </nav>
          <button className="ghost-button" onClick={handleLogout}>Logout</button>
        </aside>

        <section className="admin-content">{renderSection()}</section>

        <aside className="preview-sidebar">
          <div className="preview-head">
            <p className="section-label">Live Preview</p>
            <h2>Instant Sync</h2>
          </div>
          <PortfolioView data={draft} preview />
        </aside>
      </div>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete item?"
        description="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
