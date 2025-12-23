// Tailwind CSS configuration.

module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      spacing: {
        // Larger spacing steps for sticky offsets and layout breathing room
        '30': '7.5rem',
        '36': '9rem',
        '44': '11rem',
        '52': '13rem',
        '60': '15rem',
      },
    },
  },
  plugins: [],
};
