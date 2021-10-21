const { src, dest, parallel, series, watch } = require('gulp')

const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins() // 自动将插件的gulp-去掉，取后面的名字作为它的属性直接使用
const sass = require('gulp-sass')(require('sass')) // gulp5需要这样写，无法使用上面的方式，需要特殊处理

const del = require('del')
const browserSync = require('browser-sync')
const bs = browserSync.create()
const cwd = process.cwd()

let config = {
  build:{
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**"
    }
  }
}
try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {

}

// 清除指定目录的模板，不是gulp插件
const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 转换scss，gulp-sass
const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd:config.build.src })
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 转换script,gulp-babel
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}
// 转换页面,gulp-swig 处理swig模板页面
const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}
// 处理图片,gulp-imagemin
const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}
// public文件夹,直接拷贝
const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src}, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)

  // 这里监控svg时只能触发一次reload，还需要找下原因
  watch([config.build.paths.images, config.build.paths.fonts], { cwd: config.build.src}, bs.reload) 
  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    port: 8888,
    notify: false,
    open: true, // false取消自动打开浏览器
    // files: "dist/**",
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}
// gulp-useref 压缩合并页面和资源
const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    // 压缩html js css  -> gulp-htmlmin gulp-uglify gulp-clean-css
    // gulp-if 条件判断
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin(
      {
        collapseWhitespace: true, // collapseWhitespace 去掉空白字符
        minifyCSS: true, // 压缩css标签内部空白字符
        minifyJS: true // 压缩js标签内部空白字符
      })))
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)
const build = series(clean, parallel(series(compile, useref), image, font, extra))
const develop = series(compile, serve)
module.exports = {
  clean,
  build,
  develop
}
