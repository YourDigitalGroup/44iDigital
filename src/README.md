# Readable sources

The deployed copies of these files at the repo root are MINIFIED for page speed.
Edit the copies in this folder, then re-minify to the root:

    csso src/shared.css -o shared.css
    csso src/interior.css -o interior.css
    terser src/nav.js -c -m -o nav.js
    terser src/willow.js -c -m -o willow.js
    terser src/adaptify.js -c -m -o adaptify.js

…and bump the ?v= cache-bust query on the references when behavior changes.
