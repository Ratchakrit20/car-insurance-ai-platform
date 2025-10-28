/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6F47E4",   // ปุ่มหลัก (ม่วง)
        secondary: "#6D5BD0", // ปุ่มรอง (ม่วงอ่อนเข้มกว่า)
        accent: "#E5E0FF",    // สีเสริม hover / bg อ่อน
        grey1: "#E5E5E5",
        grey2: "#CAC9D2",
        background: "#FFFFFF",
        text: "#0F0F0F",
      },
    },
  },
  plugins: [
  require('@tailwindcss/line-clamp'),
  ],

};
