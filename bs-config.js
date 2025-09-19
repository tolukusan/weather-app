module.exports = {
  server: {
    baseDir: [
            "./src",
            "./public"
        ],
    routes: {
            "/assets": "./public",
            "/images": "./public/images"
        }
  },
  port: 3000,
  open: false,
  notify: false,
  files: [
        "./src/**/*.{html,js,css}",
        "./public/**/*.{jpg,png,gif,ico,svg}"
    ]
};