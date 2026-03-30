const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const root = process.cwd();
const storePath = path.join(root, "server", "data", "store.json");
const outputDir = path.join(root, "output", "pdf");
const publicDir = path.join(root, "public", "downloads");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

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

function drawRoundedPanel(doc, x, y, width, height, fill, stroke, radius = 18) {
  doc.save().roundedRect(x, y, width, height, radius).fillAndStroke(fill, stroke).restore();
}

function drawSectionTitle(doc, x, y, title, accent) {
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(9.5).text(title.toUpperCase(), x, y, {
    characterSpacing: 1.8,
  });
  doc
    .strokeColor("#DCE8F7")
    .lineWidth(1)
    .moveTo(x, y + 15)
    .lineTo(x + 126, y + 15)
    .stroke();
}

function drawBulletList(doc, items, x, y, width, options = {}) {
  let currentY = y;
  const textColor = options.textColor || "#30445F";
  const bulletColor = options.bulletColor || "#2F80ED";
  const fontSize = options.fontSize || 9.7;

  items.forEach((item) => {
    doc.save().fillColor(bulletColor).circle(x + 3, currentY + 6, 2.1).fill().restore();
    doc.fillColor(textColor).font("Helvetica").fontSize(fontSize).text(item, x + 12, currentY, {
      width: width - 12,
      lineGap: 2,
    });
    currentY = doc.y + 6;
  });

  return currentY;
}

function drawSkillTag(doc, x, y, text) {
  const width = doc.widthOfString(text, { font: "Helvetica-Bold", fontSize: 8.4 }) + 20;
  drawRoundedPanel(doc, x, y, width, 22, "#17335E", "#2F5B97", 11);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8.4).text(text, x, y + 7, {
    width,
    align: "center",
  });
  return width;
}

function fitTagRow(doc, tags, x, y, maxWidth) {
  let cursorX = x;
  let cursorY = y;
  tags.forEach((tag) => {
    const width = doc.widthOfString(tag, { font: "Helvetica-Bold", fontSize: 8.4 }) + 20;
    if (cursorX + width > x + maxWidth) {
      cursorX = x;
      cursorY += 28;
    }
    drawSkillTag(doc, cursorX, cursorY, tag);
    cursorX += width + 8;
  });
  return cursorY + 22;
}

function writeWrapped(doc, text, x, y, width, options = {}) {
  doc
    .fillColor(options.color || "#30445F")
    .font(options.font || "Helvetica")
    .fontSize(options.fontSize || 9.9)
    .text(text, x, y, {
      width,
      lineGap: options.lineGap || 3,
      align: options.align || "left",
    });
  return doc.y;
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
    margins: { top: 24, bottom: 24, left: 24, right: 24 },
    info: {
      Title: "Amit Shaw CV",
      Author: "Codex",
      Subject: "One-page professional resume",
    },
  });

  const stream = fs.createWriteStream(outputPdf);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 48;
  const accent = "#2F80ED";
  const accentDark = "#123B73";
  const ink = "#18263A";
  const muted = "#566A85";

  const summary =
    "Multi-skilled professional helping businesses grow through digital marketing, structured accounts support, modern websites, and AI-powered execution.";
  const profileSummary =
    "Results-focused professional with practical experience in Meta Ads, digital strategy, website development, AI-assisted research, and business operations. Known for combining clear thinking, disciplined execution, and client-friendly solutions.";
  const strengths = [
    "Meta Ads campaigns focused on reach, leads, and brand trust",
    "Digital marketing strategy and social media support",
    "Responsive websites for modern business presence",
    "AI-assisted research and workflow acceleration",
    "Advanced Excel analysis and reporting support",
  ];
  const coreSkills = [
    "Meta Ads",
    "Digital Strategy",
    "Social Media",
    "Web Development",
    "AI Research",
    "Excel Analysis",
  ];
  const serviceBullets = store.services.slice(0, 4).map((item) => item.title);
  const achievements = store.achievements.map((item) => item.title);
  const project = store.projects[0];
  const projectLines = [
    ["Problem", "Hospital lacked a strong online presence and digital trust."],
    ["Solution", "Built a responsive website with service pages and easy contact flow."],
    ["Result", "Improved branding, credibility, and patient engagement."],
  ];

  drawRoundedPanel(doc, 16, 16, pageWidth - 32, 142, "#0D1C3A", "#17335E", 26);
  doc.save().roundedRect(16, 16, pageWidth - 32, 142, 26).fillOpacity(0.18).fill("#2F80ED").restore();

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(29).text(store.profile.name, 36, 36, {
    width: 340,
  });
  doc.fillColor("#DCE9FF").font("Helvetica-Bold").fontSize(13.5).text(
    "Accounts Executive | Digital Marketer | System Developer",
    36,
    76,
    { width: 360 }
  );
  writeWrapped(doc, summary, 36, 101, 360, {
    color: "#BED0F2",
    fontSize: 10.6,
    lineGap: 3,
  });

  fitTagRow(doc, coreSkills, 36, 126, 360);

  drawRoundedPanel(doc, pageWidth - 160, 30, 108, 108, "#21406E", "#3D6FAE", 20);
  doc.image(profileImage, pageWidth - 154, 36, {
    width: 96,
    height: 96,
  });

  drawRoundedPanel(doc, 24, 172, contentWidth, 56, "#F6FAFF", "#DFE9F7", 22);
  const contactItems = [
    `Phone: ${store.settings.phone}`,
    `Email: ${store.settings.email}`,
    "Location: West Bengal, India",
    "Portfolio: skill-deploy-b13dy5vw9a.vercel.app",
  ];
  contactItems.forEach((item, index) => {
    const x = 40 + (index % 2) * 255;
    const y = 188 + Math.floor(index / 2) * 18;
    doc.fillColor(accentDark).font("Helvetica-Bold").fontSize(10.1).text(item, x, y, { width: 225 });
  });

  const leftX = 24;
  const rightX = 250;
  const leftW = 198;
  const rightW = 322;
  let leftY = 250;
  let rightY = 250;

  drawSectionTitle(doc, leftX, leftY, "Profile Summary", accent);
  leftY = writeWrapped(doc, profileSummary, leftX, leftY + 22, leftW, {
    color: ink,
    fontSize: 10,
    lineGap: 4,
  }) + 16;

  drawSectionTitle(doc, leftX, leftY, "Experience", accent);
  leftY += 24;
  store.experiences.forEach((exp) => {
    doc.fillColor(accentDark).font("Helvetica-Bold").fontSize(11.4).text(exp.role, leftX, leftY, {
      width: leftW,
    });
    doc.fillColor(accent).font("Helvetica-Bold").fontSize(9.4).text(`${exp.company} | ${exp.duration}`, leftX, leftY + 16, {
      width: leftW,
    });
    leftY = writeWrapped(doc, exp.description, leftX, leftY + 31, leftW, {
      color: muted,
      fontSize: 9.5,
      lineGap: 3,
    }) + 10;
  });

  drawSectionTitle(doc, leftX, leftY, "Achievements", accent);
  leftY = drawBulletList(doc, achievements, leftX, leftY + 24, leftW, {
    textColor: ink,
    fontSize: 9.5,
  }) + 10;

  drawSectionTitle(doc, rightX, rightY, "Core Strengths", accent);
  rightY = drawBulletList(doc, strengths, rightX, rightY + 24, rightW, {
    textColor: ink,
    fontSize: 9.6,
  }) + 12;

  drawSectionTitle(doc, rightX, rightY, "Selected Project", accent);
  rightY += 24;
  drawRoundedPanel(doc, rightX, rightY, rightW, 140, "#F7FAFF", "#D8E6F7", 20);
  doc.fillColor(accentDark).font("Helvetica-Bold").fontSize(12.5).text(project.title, rightX + 14, rightY + 14, {
    width: rightW - 28,
  });

  let projectY = rightY + 42;
  projectLines.forEach(([label, text]) => {
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(9.8).text(`${label}:`, rightX + 14, projectY, {
      continued: true,
    });
    doc.fillColor(muted).font("Helvetica").fontSize(9.8).text(` ${text}`, {
      width: rightW - 28,
      lineGap: 2,
    });
    projectY = doc.y + 6;
  });

  doc.fillColor(accent).font("Helvetica-Bold").fontSize(9.3).text(
    "Live Project: website-for-hospaccx.vercel.app",
    rightX + 14,
    rightY + 116,
    { width: rightW - 28 }
  );
  rightY += 156;

  drawSectionTitle(doc, rightX, rightY, "Services", accent);
  rightY = drawBulletList(doc, serviceBullets, rightX, rightY + 24, rightW, {
    textColor: ink,
    fontSize: 9.6,
  }) + 8;

  drawSectionTitle(doc, rightX, rightY, "Skill Snapshot", accent);
  fitTagRow(doc, store.skills.map((item) => item.name), rightX, rightY + 24, rightW);

  drawRoundedPanel(doc, 24, 760, contentWidth, 42, "#F6FAFF", "#D8E6F7", 16);
  doc.fillColor(accentDark).font("Helvetica-Bold").fontSize(11.2).text("Why Hire Me", 38, 774);
  doc
    .fillColor(muted)
    .font("Helvetica")
    .fontSize(9.7)
    .text(
      "I combine business support, digital growth, web execution, and AI-backed research to deliver practical results with a professional client experience.",
      120,
      773,
      { width: 410, lineGap: 2 }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  fs.copyFileSync(outputPdf, publicPdf);
  console.log(outputPdf);
  console.log(publicPdf);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
