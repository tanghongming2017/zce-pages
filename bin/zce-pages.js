#!/usr/bin/env node

//封装gulp到模块中

process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..'))

require('gulp-cli')();