#!/usr/bin/env -S deno run --allow-read --allow-write

import { walkSync } from "https://deno.land/std@0.188.0/fs/walk.ts";

const comics_all = JSON.parse(await Deno.readTextFile('comics.json'))

const expected_files = comics_all.map(x => x.files).flat()
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
	c.parts = {}
	const match = c.id.match(/(\d{4})(\d{2})(\d{2})(\w+)?/)
	if (!match) throw c.id
	const [, y, m ,d, x] = match
	c.parts.y = +y
	c.parts.m = +m
	c.parts.d = +d
	if (x) c.parts.x = x
}

const to_url = x => x === '.'
	? 'index.html'
	: `${x}.html`

const header = `
	<div id=header><a href=${to_url('.')}><img src=img/bird.png></a><p>free bird comics</p></div>
	<nav class=header-nav><a href='${to_url('.')}'>index</a><a href='${to_url('about')}'>about</a></nav>
	<hr>
`

const index = `
<!DOCTYPE html>
<title>index</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel=stylesheet href=img/style.css>
	${header}
	<table>
	<tr><th>id<th>title
	${comics.map(({ id, title, parts: {y, m, d, x} }) =>
		`<tr><td><a href='${to_url(id)}'>${y}.${m}.${d}${x?`${x}` : ''}</a><td>${title}`).join('')}
	</table>
`

const about = `
<!DOCTYPE html>
<title>index</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel=stylesheet href=img/style.css>
	${header}
	<p>A Tasteful Commentary On Nothing In Particular</p>
`

const comic_to_pretty = ({ parts: {y, m, d, x} }) => `${y}.${m}.${d}${x?`${x}` : ''}`
const comic_to_link = c =>
	`<a href='${to_url(c.id)}'>${comic_to_pretty(c)}</a>`

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

	<nav class=comic-nav>
		${c.prev ? comic_to_link(c.prev) : '<b></b>'}
		←<b>${comic_to_pretty(c)}</b>
		←${c.next ? comic_to_link(c.next) : '<b></b>'}
		</nav>
	<h1>${c.title}</h1>
	${c.files.map(x => `<img src='img/comic/${x}'>`).join('')}
</body>
`

const to_write = [
	['docs/index.html', index],
	['docs/about.html', about],
	...comics.map(c => [`docs/${c.id}.html`, comic_to_page(c)]),
]

console.log(await Promise.all(to_write.map(x => Deno.writeTextFile(...x))))

console.error('OK')
