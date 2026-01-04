const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'src', 'assets', 'sharespace_icon.jpg');
const outputPath = path.join(__dirname, 'src', 'assets', 'share-space.png');

async function processIcon() {
  try {
    await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate brightness
          const brightness = (r + g + b) / 3;

          // Remove light backgrounds (white/light gray)
          if (brightness > 200) {
            data[i + 3] = 0; // Transparent
          }
          // Convert dark colors to blue
          else {
            data[i] = 59;      // R
            data[i + 1] = 130; // G
            data[i + 2] = 246; // B
            data[i + 3] = 255; // Fully opaque
          }
        }

        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
        .png()
        .toFile(outputPath);
      });

    console.log('✓ ShareSpace icon processed successfully');
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

processIcon();
