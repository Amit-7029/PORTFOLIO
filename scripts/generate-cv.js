const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const root = process.cwd();
const storePath = path.join(root, "server", "data", "store.json");
const outputDir = path.join(root, "output", "pdf");
const publicDir = path.join(root, "public", "downloads");

function stripHtml(html) {
  return String(html || "")
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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function drawPill(doc, x, y, text, options = {}) {
  const paddingX = options.paddingX || 10;
  const paddingY = options.paddingY || 6;
  const height = options.height || 24;
  const width = doc.widthOfString(text, { fontSize: options.fontSize || 9 }) + paddingX * 2;

  doc
    .save()
    .roundedRect(x, y, width, height, 12)
    .fillAndStroke(options.fill || "#EAF3FF", options.stroke || "#C9D9F5")
    .restore();

  doc
    .fillColor(options.textColor || "#134074")
    .font(options.font || "Helvetica-Bold")
    .fontSize(options.fontSize || 9)
    .text(text, x, y + paddingY + 1, {
      width,
      align: "center",
    });

  return width;
}

function drawSectionTitle(doc, x, y, title, accent) {
  doc
    .fillColor(accent)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title.toUpperCase(), x, y, { characterSpacing: 1.6 });

  doc
    .strokeColor("#D6E2F3")
    .lineWidth(1)
    .moveTo(x, y + 16)
    .lineTo(x + 160, y + 16)
    .stroke();
}

function writeBulletList(doc, items, x, startY, width, options = {}) {
  let y = startY;
  const bulletColor = options.bulletColor || "#2D6CDF";
  const textColor = options.textColor || "#24324A";
  const fontSize = options.fontSize || 10.5;

  items.forEach((item) => {
    doc
      .fillColor(bulletColor)
      .circle(x + 4, y + 7, 2.2)
      .fill();

    doc
      .fillColor(textColor)
      .font(options.font || "Helvetica")
      .fontSize(fontSize)
      .text(item, x + 14, y, {
        width: width - 14,
        lineGap: 3,
      });

    y = doc.y + 7;
  });

  return y;
}

function writeServiceCards(doc, services, x, y, width) {
  const gap = 12;
  const cardWidth = (width - gap) / 2;
  const cardHeight = 92;

  services.slice(0, 4).forEach((service, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cardX = x + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    doc
      .save()
      .roundedRect(cardX, cardY, cardWidth, cardHeight, 14)
      .fillAndStroke("#F5F9FF", "#D9E5F5")
      .restore();

    doc
      .fillColor("#123B73")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(service.title, cardX + 14, cardY + 12, {
        width: cardWidth - 28,
        lineGap: 2,
      });

    doc
      .fillColor("#4A5E7A")
      .font("Helvetica")
      .fontSize(9.2)
      .text(service.description, cardX + 14, cardY + 38, {
        width: cardWidth - 28,
        height: 40,
        ellipsis: true,
        lineGap: 2,
      });
  });

  return y + (cardHeight * 2) + gap;
}

async function generate() {
  const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
  ensureDir(outputDir);
  ensureDir(publicDir);

  const outputPdf = path.join(outputDir, "Amit-Shaw-CV.pdf");
  const publicPdf = path.join(publicDir, "amit-shaw-cv.pdf");
  const profileImage = path.join(root, "public", "media", "amit-kumar-shaw.jpeg");

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 34, bottom: 34, left: 34, right: 34 },
    info: {
      Title: "Amit Shaw CV",
      Author: "Codex",
      Subject: "Professional Resume",
    },
  });

  const writeStream = fs.createWriteStream(outputPdf);
  doc.pipe(writeStream);

  const accent = "#2F80ED";
  const accentDark = "#123B73";
  const textDark = "#1C2636";
  const textMuted = "#55657E";
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

  doc
    .save()
    .roundedRect(24, 20, pageWidth - 48, 132, 24)
    .fill("#0C1630")
    .restore();

  doc
    .save()
    .roundedRect(24, 20, pageWidth - 48, 132, 24)
    .fillOpacity(0.18)
    .fill("#2F80ED")
    .restore();

  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(store.profile.name, 42, 38, { width: 320 });

  doc
    .fillColor("#DDE8FF")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("Accounts Executive | Digital Marketer | System Developer", 42, 74, {
      width: 360,
    });

  doc
    .fillColor("#B9C7E6")
    .font("Helvetica")
    .fontSize(10.2)
    .text(
      "Multi-skilled professional helping businesses grow through digital marketing, structured operations, modern websites, and AI-powered execution.",
      42,
      96,
      { width: 370, lineGap: 3 }
    );

  const pillY = 118;
  let pillX = 42;
  ["Meta Ads", "Web Development", "AI Research", "Excel Analysis"].forEach((item) => {
    pillX += drawPill(doc, pillX, pillY, item, {
      fill: "#17315D",
      stroke: "#305A96",
      textColor: "#FFFFFF",
      fontSize: 8.5,
      height: 22,
    }) + 8;
  });

  const photoX = pageWidth - 160;
  const photoY = 34;
  doc
    .save()
    .roundedRect(photoX - 6, photoY - 6, 108, 108, 20)
    .fill("#1A2B53")
    .restore();
  doc.image(profileImage, photoX, photoY, { width: 96, height: 96 });

  doc
    .save()
    .roundedRect(24, 162, pageWidth - 48, 58, 20)
    .fill("#F7FAFF")
    .restore();

  const contactItems = [
    `Phone: ${store.settings.phone}`,
    `Email: ${store.settings.email}`,
    "Location: West Bengal, India",
    "Portfolio: skill-deploy-b13dy5vw9a.vercel.app",
  ];
  contactItems.forEach((item, index) => {
    const x = 42 + (index % 2) * 255;
    const y = 178 + Math.floor(index / 2) * 18;
    doc
      .fillColor(accentDark)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(item, x, y, { width: 220 });
  });

  let y = 242;
  const leftX = 34;
  const rightX = 318;
  const columnWidth = 244;

  drawSectionTitle(doc, leftX, y, "Profile Summary", accent);
  doc
    .fillColor(textDark)
    .font("Helvetica")
    .fontSize(10.5)
    .text(
      stripHtml(store.profile.aboutHtml),
      leftX,
      y + 24,
      { width: columnWidth, lineGap: 4 }
    );

  drawSectionTitle(doc, rightX, y, "Core Strengths", accent);
  writeBulletList(
    doc,
    [
      "Meta Ads campaigns for reach, leads, and brand growth",
      "Digital marketing strategy and social media support",
      "Responsive website development for modern businesses",
      "AI-assisted research and workflow optimization",
      "Advanced Excel reporting and analysis support",
    ],
    rightX,
    y + 24,
    columnWidth,
    { textColor: textDark }
  );

  y = 408;
  drawSectionTitle(doc, leftX, y, "Experience", accent);
  const expStart = y + 24;
  store.experiences.forEach((exp, index) => {
    const blockY = expStart + index * 72;
    doc
      .fillColor(accentDark)
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .text(exp.role, leftX, blockY, { width: columnWidth });
    doc
      .fillColor(accent)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text(`${exp.company} | ${exp.duration}`, leftX, blockY + 16, { width: columnWidth });
    doc
      .fillColor(textMuted)
      .font("Helvetica")
      .fontSize(9.8)
      .text(exp.description, leftX, blockY + 32, {
        width: columnWidth,
        lineGap: 3,
      });
  });

  drawSectionTitle(doc, rightX, y, "Selected Project", accent);
  const project = store.projects[0];
  doc
    .save()
    .roundedRect(rightX, y + 24, columnWidth, 146, 18)
    .fillAndStroke("#F6FAFF", "#D8E5F5")
    .restore();
  doc
    .fillColor(accentDark)
    .font("Helvetica-Bold")
    .fontSize(12.5)
    .text(project.title, rightX + 14, y + 36, { width: columnWidth - 28 });
  const projectBlocks = [
    "Problem: Limited online presence and weak digital trust.",
    "Solution: Built a responsive website with service pages and a simple contact flow.",
    "Result: Better branding, higher credibility, and stronger patient engagement.",
  ];
  projectBlocks.forEach((line, index) => {
    const [label, rest] = line.split(": ");
    const lineY = y + 62 + index * 28;
    doc
      .fillColor(textDark)
      .font("Helvetica-Bold")
      .fontSize(9.8)
      .text(`${label}:`, rightX + 14, lineY, { continued: true });
    doc
      .font("Helvetica")
      .text(` ${rest}`, { width: columnWidth - 28, lineGap: 2 });
  });
  doc
    .fillColor(accent)
    .font("Helvetica-Bold")
    .fontSize(9.3)
    .text("Live Project: website-for-hospaccx.vercel.app", rightX + 14, y + 138, {
      width: columnWidth - 28,
    });

  doc.addPage({
    size: "A4",
    margins: { top: 34, bottom: 34, left: 34, right: 34 },
  });

  doc
    .save()
    .roundedRect(24, 20, pageWidth - 48, 90, 24)
    .fill("#0C1630")
    .restore();

  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("Amit Shaw - Professional Resume", 38, 38, { width: 380 });
  doc
    .fillColor("#C7D6F4")
    .font("Helvetica")
    .fontSize(11)
    .text("Services, skills, achievements, and project-ready capabilities", 38, 70);

  let page2Y = 132;
  drawSectionTitle(doc, 34, page2Y, "Services", accent);
  page2Y = writeServiceCards(doc, store.services, 34, page2Y + 24, contentWidth);

  drawSectionTitle(doc, 34, page2Y + 18, "Skills Snapshot", accent);
  let chipY = page2Y + 44;
  let chipX = 34;
  store.skills.forEach((skill) => {
    const width = drawPill(doc, chipX, chipY, `${skill.name} ${skill.level}%`, {
      fill: "#F2F7FF",
      stroke: "#D2E0F5",
      textColor: "#19437B",
      height: 24,
    });
    chipX += width + 8;
    if (chipX > pageWidth - 150) {
      chipX = 34;
      chipY += 32;
    }
  });

  const achieveY = chipY + 52;
  drawSectionTitle(doc, 34, achieveY, "Achievements", accent);
  writeBulletList(
    doc,
    store.achievements.map((item) => item.title),
    34,
    achieveY + 24,
    contentWidth,
    { textColor: textDark }
  );

  const footerY = 730;
  doc
    .save()
    .roundedRect(24, footerY, pageWidth - 48, 68, 18)
    .fill("#F7FAFF")
    .restore();
  doc
    .fillColor(accentDark)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Why Hire Me", 40, footerY + 14);
  doc
    .fillColor(textMuted)
    .font("Helvetica")
    .fontSize(10.2)
    .text(
      "I combine business support, digital marketing, web development, and AI-backed execution to help businesses look professional, work smarter, and grow with confidence.",
      40,
      footerY + 32,
      { width: pageWidth - 80, lineGap: 3 }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  fs.copyFileSync(outputPdf, publicPdf);
  console.log(outputPdf);
  console.log(publicPdf);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
