export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FC8019',
        bg: '#FFFFFF',
        'bg-secondary': '#F2F2F2',
        'text-dark': '#282C3F',
        'text-muted': '#6F7280',
        success: '#60B246',
        danger: '#E02020',
        warning: '#FC8019',
        border: '#E9E9EB'
      },
      boxShadow: {
        card: '0 1px 3px rgba(40, 44, 63, 0.08)'
      }
    }
  },
  plugins: []
};
