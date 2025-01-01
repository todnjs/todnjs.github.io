#!/usr/bin/env -S deno run --allow-read --allow-write

import { walkSync } from "https://deno.land/std@0.188.0/fs/walk.ts";

const comics_all = JSON.parse(await Deno.readTextFile('comics.json'))

if (comics_all.length !== new Set(comics_all.map(c => c.id)).size)
	throw `non-unique ids`

for (const comic of comics_all) {
	if (comic.file != null && comic.files != null)
		throw `please specify only file or files`
	if (comic.file == null && comic.files == null)
		throw `no files attached`

	const fs = comic.file ? [comic.file] : comic.files

	comic._files = fs.map(fname => `${comic.id}-${fname}`)

	if (comic.title == null)
		comic.title = fs[0].replace(/\.\w+/, '')

	comic._filename = `${comic.id}.html`

	const match = comic.id.match(/(\d{4})(\d{2})(\d{2})(\w+)?/)
	if (!match) throw comic.id
	const [, y, m , d, x] = match

	comic._display_id = `${+y}.${+m}.${+d}${x ?? ''}`
}

const expected_files = comics_all.map(x => x._files).flat()
const real_files = [...walkSync('docs/img/comic', {includeDirs: false})]

const expected_check = new Set(expected_files)
const real_check = new Set(real_files.map(({ name }) => name))

for (const name of expected_files) {
	if (!real_check.has(name))
		throw `could not find image file: ${name}`
}

for (const { name } of real_files) {
	if (!expected_check.has(name))
		throw `unexpected image file: ${name}`
}

console.error('files as expected')

const comics = comics_all.filter(c => (c.rating ?? 0) >= 0)
comics.sort((b, a) => a.id.localeCompare(b.id))

for (let i=0; i<comics.length; i+=1) {
	const c = comics[i]
	c.prev = comics[i-1]
	c.next = comics[i+1]
}

const to_url = x => x === '.'
	? 'index.html'
	: `${x}.html`

const header = `
	<div id=header><a href=${to_url('.')}><img src=img/bird.png></a><p>free bird comics</p></div>
	<nav class=header-nav><a href='${to_url('.')}'>index</a><a href='${to_url('about')}'>about</a></nav>
	<hr>
`

const comic_nav = c => `<nav class=comic-nav>
${c.prev ? comic_to_link(c.prev) : '<b></b>'}
←<b>${c._display_id}</b>
←${c.next ? comic_to_link(c.next) : '<b></b>'}
</nav>`

const index = `
<!DOCTYPE html>
<title>index</title>
<meta property='og:title' content='free bird comics'>
<meta property='og:type' content='bird comics'>
<meta property='og:image' content='https://todnjs.github.io/img/bird.png'>
<meta property='og:description' content='free bird comics'>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel=stylesheet href=img/style.css>
	${header}
	<table>
	<tr><th>id<th>title
	${comics.map(({ _filename, _display_id, title }) =>
		`<tr><td><a href='${_filename}'>${_display_id}</a><td>${title}`).join('')}
	</table>
`

const about = `
<!DOCTYPE html>
<title>about</title>
<meta property='og:title' content='free bird comics - about'>
<meta property='og:type' content='bird comics'>
<meta property='og:image' content='https://todnjs.github.io/img/bird.png'>
<meta property='og:description' content='A Tasteful Commentary On Nothing In Particular'>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel=stylesheet href=img/style.css>
	${header}
	<p>A Tasteful Commentary On Nothing In Particular</p>
`

const comic_to_link = c =>
	`<a href='${c._filename}'>${c._display_id}</a>`

const comic_to_page = c => `
<!DOCTYPE html>
<title>${c.title}</title>
<meta property='og:title' content='${c.title} - free bird comic'>
<meta property='og:type' content='bird comic'>
<meta property='og:image' content='https://todnjs.github.io/img/bird.png'>
<meta property='og:description' content='an amusing bird comic entitled „${c.title}"'>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel=stylesheet href=img/style.css>

<body>
	${header}

	${comic_nav(c)}
	<h1>${c.title}</h1>
	<div class=images>${c._files.map(x => `<img src='img/comic/${x}'>`).join('')}</div>
	${comic_nav(c)}
</body>
`

const to_write = [
	['docs/index.html', index],
	['docs/about.html', about],
	...comics.map(c => [`docs/${c._filename}`, comic_to_page(c)]),
]

console.log(await Promise.all(to_write.map(x => Deno.writeTextFile(...x))))

console.error('OK')
