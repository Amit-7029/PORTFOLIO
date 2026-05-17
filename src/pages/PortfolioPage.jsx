import React, { useEffect } from "react";
import PortfolioView from "../components/PortfolioView";
import { usePortfolio } from "../context/PortfolioContext";

function getAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^(https?:)?\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).toString();
}

function setMetaAttribute(selector, attribute, value) {
  if (!value) return;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

function setLinkRel(rel, href, extra = {}) {
  if (!href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
  Object.entries(extra).forEach(([key, value]) => element.setAttribute(key, value));
}

function upsertJsonLd(id, data) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

function usePortfolioSeo(portfolio) {
  useEffect(() => {
    if (!portfolio) return;

    const { profile, settings, sections, skills, projects } = portfolio;
    const siteName = settings.seoSiteName || "Amit Shaw Portfolio";
    const title = settings.seoTitle || `${profile.name} | ${profile.headline}`;
    const description = settings.seoDescription || profile.subheadline;
    const keywords = settings.seoKeywords || "";
    const canonicalUrl = getAbsoluteUrl(settings.seoCanonicalUrl || window.location.href.split("#")[0]);
    const imageUrl = getAbsoluteUrl(settings.seoImage || settings.faviconImage || profile.image);
    const faviconUrl = getAbsoluteUrl(settings.faviconImage || profile.image);
    const author = settings.seoAuthor || profile.name;
    const locale = settings.seoLocale || "en_IN";
    const robots = settings.seoRobots || "index, follow, max-image-preview:large";
    const type = settings.seoType || "profile";

    document.documentElement.lang = settings.seoLanguage || "en";
    document.title = title;

    setMetaAttribute('meta[name="description"]', "name", "description");
    document.head.querySelector('meta[name="description"]')?.setAttribute("content", description);
    setMetaAttribute('meta[name="keywords"]', "name", "keywords");
    document.head.querySelector('meta[name="keywords"]')?.setAttribute("content", keywords);
    setMetaAttribute('meta[name="author"]', "name", "author");
    document.head.querySelector('meta[name="author"]')?.setAttribute("content", author);
    setMetaAttribute('meta[name="robots"]', "name", "robots");
    document.head.querySelector('meta[name="robots"]')?.setAttribute("content", robots);
    setMetaAttribute('meta[name="theme-color"]', "name", "theme-color");
    document.head.querySelector('meta[name="theme-color"]')?.setAttribute("content", portfolio.theme?.backgroundColor || "#07111f");

    const ogTags = {
      "og:type": type,
      "og:site_name": siteName,
      "og:title": title,
      "og:description": description,
      "og:url": canonicalUrl,
      "og:image": imageUrl,
      "og:locale": locale,
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": imageUrl,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      const attribute = property.startsWith("twitter:") ? "name" : "property";
      setMetaAttribute(`meta[${attribute}="${property}"]`, attribute, property);
      document.head.querySelector(`meta[${attribute}="${property}"]`)?.setAttribute("content", content);
    });

    setLinkRel("canonical", canonicalUrl);
    setLinkRel("icon", faviconUrl, { type: "image/jpeg" });
    setLinkRel("apple-touch-icon", faviconUrl);

    if (settings.seoStructuredDataEnabled !== false) {
      upsertJsonLd("portfolio-person-schema", {
        "@context": "https://schema.org",
        "@type": "Person",
        name: profile.name,
        jobTitle: profile.headline,
        description,
        image: imageUrl,
        url: canonicalUrl,
        email: settings.email,
        telephone: settings.phone,
        address: settings.location ? { "@type": "PostalAddress", addressLocality: settings.location } : undefined,
        sameAs: [settings.linkedinLink, settings.githubLink, settings.whatsappLink].filter(Boolean),
        knowsAbout: (skills || []).map((skill) => skill.name).filter(Boolean).slice(0, 20),
      });

      upsertJsonLd("portfolio-website-schema", {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: canonicalUrl,
        description,
        inLanguage: settings.seoLanguage || "en",
      });

      upsertJsonLd("portfolio-project-schema", {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: sections?.projects?.title || "Portfolio Projects",
        itemListElement: (projects || []).slice(0, 8).map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: project.title,
            description: project.description,
            url: project.liveLink || canonicalUrl,
            image: getAbsoluteUrl(project.image),
          },
        })),
      });
    }
  }, [portfolio]);
}

export default function PortfolioPage() {
  const { portfolio, loadPublicPortfolio } = usePortfolio();

  usePortfolioSeo(portfolio);

  useEffect(() => {
    loadPublicPortfolio();
  }, []);

  return (
    <div className="public-page-shell">
      <PortfolioView data={portfolio} />
    </div>
  );
}
