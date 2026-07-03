const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// CRA 5 configures postcss-loader with an inline plugin list and ignores a
// root postcss.config.js, so the plain `style.postcss.plugins` form doesn't
// reliably reach the loader. Mutating the resolved loaderOptions directly —
// prepending Tailwind (must run before autoprefixer) ahead of CRA's own
// plugins — is the dependable way to get build-time Tailwind compilation.
module.exports = {
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: (opts) => {
        opts.postcssOptions = opts.postcssOptions || {};
        const existing = opts.postcssOptions.plugins;
        const existingArr = typeof existing === 'function' ? existing() : (existing || []);
        opts.postcssOptions.plugins = [tailwindcss('./tailwind.config.js'), autoprefixer, ...existingArr];
        return opts;
      },
    },
  },
};
