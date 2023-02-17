/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  serverDependenciesToBundle: [
    'filenamify',
    'trim-repeated',
    'filename-reserved-regex',
    'strip-outer',
  ],
  future: {
    unstable_tailwind: true,
  },
}
