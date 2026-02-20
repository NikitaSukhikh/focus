/**
 * Script to capture tutorial slide screenshots
 * Renders each slide and saves as PNG image
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Slide content from the IntroSlideshow component
const slides = [
  {
    title: "Welcome to Focus",
    description: "Workspace for organizing web links, articles, \nquick notes, files and documents — all in one place\n\nFocus is your knowledge hub for business,\nworkflows and learning processes\n\nBest for:\n- collecting and sharing ideas, sources\n- effecient brainstorming and research \n- seamless and fast interactions between files, links, and notes\n\nEnjoy staying focused!",
    descriptionAlign: 'left',
  },
  {
    title: "385 file types supported",
    description: "Documents, audio, video, images, PDF, ebooks, presentations, spreadsheets and many more. Drop, open and preview directly in Focus",
    image: 'files_supported_example.png',
  },
  {
    title: "Connect everything visually",
    description: "Draw arrows between any objects to create visual graphs.\nSee how your ideas, links and files relate to each other.",
    image: 'Arrows_example.png',
  },
  {
    title: "Quick notes",
    description: "Add text notes anywhere on the center pane\nNotes are automatically saved",
    image: 'textnote_example.png',
  },
  {
    title: "Share in one click",
    description: "Share any object or entire space instantly via all popular platforms\nYour audience doesn't need Focus to view shared content",
    image: 'share_link_example.png',
  },
  {
    title: "Single-click: for quick preview",
    description: "You can navigate between links and files inside the preview pane\neither on the right preview pane or in full window mode",
    image: 'preview_example.png',
  },
  {
    title: "Double-click: to open files in your favorite app",
    description: "For deeper interactions with files (for instance, to edit them)\nopen them in any external app",
    image: 'external_file_example.png',
  },
  {
    title: "For quick access, use shortcuts:",
    description: "\n\n\nCreate new space: Ctrl+Y\nAdd object: Ctrl+I\nToggle preview pane: Ctrl+U\nUndo/Redo: Ctrl+Z / Ctrl+Shift+Z\nOpen/Close left sidebar: Ctrl+ ←/→\nNavigate spaces on the left sidebar: Ctrl+↑/↓",
  },
];

const CARD_MAX_WIDTH = 720;
const CARD_HORIZONTAL_PADDING = 48;

// HTML template for rendering slides
function generateSlideHTML(slide, index, logoBase64, imageBase64) {
  const textAlign = slide.descriptionAlign === 'left' ? 'left' : 'center';
  const imageHTML = imageBase64 ? `
    <div class="slide-image">
      <img src="${imageBase64}" alt="${slide.title}">
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }

    .card {
      position: relative;
      width: 100%;
      max-width: ${CARD_MAX_WIDTH}px;
      min-height: 560px;
      padding: 32px ${CARD_HORIZONTAL_PADDING}px 20px;
      background: rgba(18, 18, 18, 0.95);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .logo {
      height: 58px;
      margin-bottom: 28px;
      user-select: none;
      object-fit: contain;
    }

    .content {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 12px;
      color: #ffffff;
      line-height: 1.4;
    }

    p {
      font-size: 16px;
      line-height: 1.6;
      color: #aaaaaa;
      white-space: pre-line;
      text-align: ${textAlign};
      max-width: 100%;
    }

    .slide-image {
      margin-top: 16px;
      width: 100%;
      height: 340px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .slide-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      pointer-events: none;
    }

    .skip {
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 8px;
      color: #888888;
      background: transparent;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <img class="logo" src="${logoBase64}" alt="Focus">
    <button class="skip">Skip</button>
    <div class="content">
      <h2>${slide.title}</h2>
      <p>${slide.description}</p>
      ${imageHTML}
    </div>
  </div>
</body>
</html>
  `;
}

// Convert image to base64
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

async function captureSlides() {
  const outputDir = path.join(__dirname, '..', 'ui', 'public');
  const logoPath = path.join(__dirname, '..', 'ui', 'src-electron', 'focus-brand.png');
  const logosDir = path.join(__dirname, '..', 'ui', 'public', 'logos');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Convert logo to base64
  console.log('Converting logo to base64...');
  const logoBase64 = imageToBase64(logoPath);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1280,
      height: 900,
      deviceScaleFactor: 2, // Higher resolution for crisp images
    },
  });

  const page = await browser.newPage();

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    console.log(`Capturing slide ${i}: ${slide.title}`);

    // Convert slide image to base64 if it exists
    const imageBase64 = slide.image
      ? imageToBase64(path.join(logosDir, slide.image))
      : null;

    const html = generateSlideHTML(slide, i, logoBase64, imageBase64);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Wait a bit for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot of just the card
    const card = await page.$('.card');
    const outputPath = path.join(outputDir, `tutorial-slide-${i}.png`);

    await card.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: true,
    });

    console.log(`  Saved: ${outputPath}`);
  }

  await browser.close();
  console.log('\nAll slides captured successfully!');
  console.log(`Output directory: ${outputDir}`);
}

// Run the script
captureSlides().catch(console.error);
