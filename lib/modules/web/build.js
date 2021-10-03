import fs from 'fs';
import esbuild from 'esbuild';

async function build () {
  const watch = process.env.NODE_ENV === 'development';

  async function buildJs () {
    const result = await esbuild.build({
      entryPoints: ['./web/js/index.js'],
      bundle: true,
      sourcemap: true,
      metafile: true,
      outfile: './web/public/index.min.js',
      watch,
      minify: true,
      loader: {
        '.svg': 'file',
        '.gif': 'file',
        '.png': 'file',
        '.js': 'jsx'
      },
      define: {
        'process.env.NODE_ENV': '"' + process.env.NODE_ENV + '"'
      }
    });
    fs.writeFileSync('./web/meta.json', JSON.stringify(result.metafile, null, 2));
  }

  async function buildCss () {
    await esbuild.build({
      entryPoints: ['./web/css/index.css'],
      bundle: true,
      sourcemap: true,
      outfile: './web/public/index.min.css',
      watch,
      loader: {
        '.svg': 'file',
        '.png': 'file'
      }
    });
  }

  async function buildHtml () {
    let html = await fs.promises.readFile('./web/html/index.html', 'utf8');

    html = html.replace('{BASE_URL}', process.env.BASE_URL || '/');

    await fs.promises.writeFile('./web/public/index.html', html);
  }

  await Promise.all([
    buildCss(),
    buildJs(),
    buildHtml()
  ]);
}

export default build;
