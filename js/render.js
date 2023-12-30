import './d3.prototype.extensions.js'
import './Array.prototype.extensions.js'
import { platform, getCoordinates, sdgcolors, colors, chunk } from './main.js'

export function bundle (kwargs) {
	const { nodes, links, pads, svg, width, height, padding } = kwargs

	const nodeScale = d3.scaleLinear()
		.domain(d3.extent(nodes, d => d.count))
		.range([30, 60])
	const linkScale = d3.scaleLinear()
		.domain(d3.extent(links, d => d.count))
		.range([1, 10])

	const g = svg.styles({
		'width': `calc(100% - ${padding}px)`,
		'height': `calc(100% - ${padding}px)`,
	}).select('g')

	const link = g.addElems('path', 'link', links)
		.attr('d', d => {
			const s_angle = 360 * (d.source - 1) / nodes.length
			const source = getCoordinates(s_angle, .3, width, height)
			return `M ${source.join(' ')} Q ${source.join(' ')} ${source.join(' ')}`
		}).styles({
			'stroke': colors['light-grey'],
			'stroke-opacity': .5,
			'stroke-width': d => linkScale(d.count),
			'fill': 'none',
		})
	.transition()
		.duration(500)
	.attr('d', d => {
		const s_angle = 360 * (d.source - 1) / nodes.length
		const t_angle = 360 * (d.target - 1) / nodes.length
		const source = getCoordinates(s_angle, .3, width, height)
		const target = getCoordinates(t_angle, .3, width, height)
		return `M ${source.join(' ')} Q ${width / 2} ${height / 2} ${width / 2} ${height / 2}`
	}).transition()
		.duration(500)
		.attr('d', d => {
			const s_angle = 360 * (d.source - 1) / nodes.length
			const t_angle = 360 * (d.target - 1) / nodes.length
			const source = getCoordinates(s_angle, .3, width, height)
			const target = getCoordinates(t_angle, .3, width, height)
			return `M ${source.join(' ')} Q ${width / 2} ${height / 2} ${target.join(' ')}`
		})

	const node = g.addElems('g', 'node', nodes.sort((a, b) => a.id - b.id))
		.attr('transform', `translate(${[ width / 2, height / 2 ]})`)
	.on('click', function (d) {
		const sel = d3.select(this).moveToFront();
		// DIM ALL OTHER NODES
		const connections = links.filter(c => c.source === d.id || c.target === d.id);
		const maxConnections = Math.max(...connections.map(c => c.count))

		g.selectAll('g.node circle.color')
		.each(function (c) {
			const sel = d3.select(this)
			
			sel.styles({
				'fill': c => {
					if (c.id === d.id) return sdgcolors[d.id - 1];
					else {
						if (connections.some(b => b.source === c.id || b.target === c.id)) {
							return colors['light-grey'];
						} else return colors['light-2'];
					}
				},
				'fill-opacity': c => {
					if (c.id === d.id) return 1;
					else return (connections.find(b => b.source === c.id || b.target === c.id)?.count ?? 0) / maxConnections;
				}
			});
		})
		// DIM ALL NOT CONNECTED LINKS
		g.selectAll('path.link')
		.styles({
			'stroke': c => {
				if (c.source === d.id || c.target === d.id) return sdgcolors[d.id - 1];
				else return colors['light-grey'];
			},
			'stroke-opacity': c => {
				if (c.source === d.id || c.target === d.id) return .5;
				else return .05;
			},
		})
		// DISPLAY THE PAD SNIPPETS
		const associated_pads = pads.flat().filter(c => {
			return c.tags?.some(b => b.type === 'sdgs' && b.key === d.id)
		})
		const title = associated_pads.map(c => c.tags.filter(b => b.key === d.id)).flat().unique('key')[0].name

		displaySnippets({ id: d.id, title: `SDG ${d.id}: ${title}`, data: associated_pads });
	});
	node.addElems('circle', 'blank')
		.attrs({ 
			'r': d => nodeScale(d.count)
		})
		.style('fill', '#FFF');
	node.addElems('circle', 'color')
		.attrs({ 
			'r': d => nodeScale(d.count), 
			'title': d => d.id
		})
		.style('fill', d => {
			return sdgcolors[d.id - 1]
		});
	node.addElems('image')
		.attrs({
			'href': d => `imgs/sdgs/G${d.id}-l.svg`,
			'width': d => nodeScale(d.count),
			'height': d => nodeScale(d.count),
			'x': d => -nodeScale(d.count) / 2,
			'y': d => -nodeScale(d.count) / 2,
		})
	// ANIMATE IN
	node.transition()
		.ease(d3.easeElasticOut.amplitude(1).period(0.3))
		.duration(1000)
		.delay((d, i) => i * 10)
		.attr('transform', d => {
			const angle = 360 * (d.id - 1) / nodes.length
			const pos = getCoordinates(angle, .3, width, height)
			return `translate(${pos})`
		})

	// annotate(pads)
}

export function matrix (kwargs) {
	const { nodes, links, pads, svg, width, height, padding } = kwargs
	const cellsize = Math.min(width * .8, height * .8) / (nodes.length + 1)

	nodes.sort((a, b) => a.id - b.id)

	const nodeScale = d3.scaleLinear()
		.domain(d3.extent(nodes, d => d.count))
		.range([cellsize * .5, cellsize * 3])
	const edgeScale = d3.scaleLinear()
		.domain(d3.extent(links, d => d.count))
		.range([0, 1])

	const g = svg.styles({
		'width': `calc(100% - ${padding}px)`,
		'height': `calc(100% - ${padding}px)`,
	}).select('g')
		.attr('transform', `translate(${[ (width - cellsize * (nodes.length + 1)) / 2, (height - cellsize * (nodes.length + 1)) / 2 ]})`)

	const column_headers = g.addElems('g', 'column-header', nodes)
		.attr('transform', (d, i) => `translate(${[i * cellsize, -cellsize]})`)
	column_headers.addElems('rect', 'head')
		.attrs({
			'width': cellsize,
			'height': cellsize,
		}).style('fill', d => sdgcolors[d.id - 1])
	column_headers.addElems('image')
		.attrs({
			'href': d => `imgs/sdgs/G${d.id}-l.svg`,
			'width': cellsize * .8,
			'height': cellsize * .8,
			'x': cellsize * .1,
			'y': cellsize * .1,
		});

	const row_headers = g.addElems('g', 'row-header', nodes)
		.attr('transform', (d, i) => `translate(${[-cellsize, i * cellsize]})`)
	row_headers.addElems('rect', 'head')
		.attrs({
			'width': cellsize,
			'height': cellsize,
		}).style('fill', d => sdgcolors[d.id - 1])
	row_headers.addElems('image')
		.attrs({
			'href': d => `imgs/sdgs/G${d.id}-l.svg`,
			'width': cellsize * .8,
			'height': cellsize * .8,
			'x': cellsize * .1,
			'y': cellsize * .1,
		});

	g.addElems('g', 'row', nodes)
		.attr('transform', (d, i) => `translate(${[0, i * cellsize]})`)
	.addElems('rect', 'cell', d => {
		return nodes.map(c => {
			const obj = Object.assign({}, c)
			obj.adjacent = d.id
			obj.count = links.find(b => (b.source === d.id && b.target === c.id) || (b.source === c.id && b.target === d.id))?.count ?? 0
			return obj
		})
	}).attrs({
		'width': cellsize,
		'height': cellsize,
		'x': (d, i) => i * cellsize
	}).styles({
		'fill': colors['dark-blue'],
		'fill-opacity': d => edgeScale(d.count),
	}).on('mouseover', function (d, i) {
		const col = g.selectAll('.column-header')
			.filter(c => c.id === d.id)
		col.select('rect.head')
		.transition()
		.duration(250)
		.attrs({
			'height': cellsize * 2,
			'y': -cellsize,
		});
		col.select('image')
		.transition()
		.duration(250)
		.attr('y', -cellsize + cellsize * .1)

		const row = g.selectAll('.row-header')
			.filter(c => c.id === d.adjacent)
		row.select('rect.head')
		.transition()
		.duration(250)
		.attrs({
			'width': cellsize * 2,
			'x': -cellsize,
		})
		row.select('image')
		.transition()
		.duration(250)
		.attr('x', -cellsize + cellsize * .1)

		// DISPLAY COUNT
		const associated_pads = pads.flat().filter(c => {
			return c.tags?.some(b => b.type === 'sdgs' && b.key === d.id) && c.tags?.some(b => b.type === 'sdgs' && b.key === d.adjacent)
		})

		if (d.id !== d.adjacent) {
			d3.select(this.parentNode)
			.addElems('text', 'count')
			.attrs({
				'x': i * cellsize + cellsize / 2,
				'y': cellsize / 2,
				'dy': '.3em'
			}).text(associated_pads.length)
		}

	}).on('mouseout', function (d) {
		const col = g.selectAll('.column-header')
			.filter(c => c.id === d.id)
		col.select('rect.head')
		.transition()
		.duration(250)
		.attrs({
			'height': cellsize,
			'y': 0,
		})

		col.select('image')
		.transition()
		.duration(250)
		.attr('y', cellsize * .1)

		const row = g.selectAll('.row-header')
			.filter(c => c.id === d.adjacent)
		row.select('rect.head')
		.transition()
		.duration(250)
		.attrs({
			'width': cellsize,
			'x': 0,
		})

		row.select('image')
		.transition()
		.duration(250)
		.attr('x', cellsize * .1)

		d3.selectAll('text.count').remove()
	}).on('click', function (d) {
		d3.selectAll('rect.cell').style('stroke', 'none')
		d3.select(this).moveToFront()
		.styles({
			'stroke': colors['mid-yellow'],
			'stroke-width': 3
		});
		d3.select(this.parentNode).moveToFront();

		// DISPLAY THE PAD SNIPPETS
		const associated_pads = pads.flat().filter(c => {
			return c.tags?.some(b => b.type === 'sdgs' && b.key === d.id) && c.tags?.some(b => b.type === 'sdgs' && b.key === d.adjacent)
		})
		const id = [d.id, d.adjacent]
		id.sort((a, b) => a - b)
		const title = id.map(c => {
			return associated_pads.map(b => b.tags.filter(a => a.key === c)).flat().unique('key')[0].name
		}).join(' x ')

		displaySnippets({ id, title: `SDGs ${id.join(' x ')}: ${title}`, data: associated_pads });
	});

	// ADD MARGINALS
	g.addElems('g', 'marginal', nodes)
		.attr('transform', (d, i) => `translate(${[cellsize * nodes.length, i * cellsize]})`)
	.addElems('rect')
		.attrs({
			'width': d => nodeScale(d.count),
			'height': cellsize,
		}).style('fill', d => sdgcolors[d.id - 1]);
}

function annotate (pads) {
	const txtvars = { fontsize: 10, dy: 1.4 }
	const titlevars = { fontsize: 18, dy: 1.3 }

	const snippet = g.addElems('g', 'snippet', _ => {
		return nodes.filter(d => [1, 5, 8, 11, 13, 17].includes(d.id))
		.map(d => {
			const pad = pads.flat().shuffle()
			.find(c => {
				return c.tags?.some(b => b.type === 'sdgs' && b.key === d.id) && c.snippet && c.vignette && !c.title.includes('…')
			})

			const title = pad.title.split(' ')
			const tlines = chunk(title, 3)

			const snippet = pad.snippet.split(' ')
			let lines = chunk(snippet, 5)
			if (lines.length > 5) {
				lines = lines.slice(0, 5)
				lines.push(['...'])
			}

			const angle = (360 * d.id / nodes.length) // TO DO: DOES THIS NEED TO BE d.id - 1?
			let anchor = 'start'
			if (angle > 180) anchor = 'end'
			const p_angle = 360 * (d.id - 1) / nodes.length
			let pos = getCoordinates(p_angle, .4, width, height)
			if (angle < 90 || angle > 270) {
				pos[1] -= (txtvars.fontsize * txtvars.dy * (lines.length + .5)) + (titlevars.fontsize * titlevars.dy * tlines.length)
			}
			return { id: d.id, pad, pos, anchor, lines, tlines }
		})
	}).attr('transform', d => `translate(${d.pos})`)
	snippet.addElems('text', 'title')
		.addElems('tspan', null, d => {
			return d.tlines.map(c => {
				return { line: c, anchor: d.anchor, id: d.id }
			})
		}).attrs({
			'x': 0,
			'dy': titlevars.fontsize * titlevars.dy,
		}).styles({
			'font-size': `${titlevars.fontsize}px`,
			'font-weight': 'bold',
			'text-anchor': d => d.anchor,
			'fill': d => sdgcolors[d.id - 1]
		})
		.text(d => d.line.join(' '))
	snippet.addElems('text', 'description')
		.attr('transform', d => `translate(0, ${d.tlines.length * titlevars.fontsize * titlevars.dy + txtvars.fontsize * txtvars.dy * .5})`)
		.addElems('tspan', null, d => {
			return d.lines.map(c => {
				return { line: c, anchor: d.anchor }
			})
		}).attrs({
			'x': 0,
			'dy': txtvars.fontsize * txtvars.dy,
		}).style('text-anchor', d => d.anchor)
		.text(d =>  d.line.join(' '))
}

function renderMenu (regions, countries, tags) {
	// ADD THE mobilizations VALUES FOR NOW AS WE DO NOT ENABLE SELECTION YET
	const cartouche = d3.select('.cartouche')
	const form = cartouche.select('form')

	form.addElems('input', 'mobilizations', basetags_params.getAll('mobilizations'))
		.attrs({
			'type': 'hidden',
			'name': 'mobilizations',
			'value': d => d
		})

	// ADD THE DROPDOWNS
	regions.sort((a, b) => a.undp_region.localeCompare(b.undp_region))
	countries = countries.filter(d => {
		if (basetags_params.getAll('regions').length) return d.has_lab && basetags_params.getAll('regions').includes(d.undp_region)
		else return d.has_lab
	})

	tags.sort((a, b) => a.name?.localeCompare(b.name))
	
	// FOR FILTERING
	const regions_menu = cartouche.select('menu.f-regions')
	.addElems('li', 'region', regions)
	
	regions_menu.addElems('input')
		.attrs({
			'type': 'checkbox',
			'value': d => d.undp_region,
			'id': d => d.undp_region,
			'name': 'regions',
			'checked': d => basetags_params.getAll('regions').includes(d.undp_region) || null
		})
	regions_menu.addElems('label')
		.attr('for', d => d.undp_region)
	.html(d => `${d.undp_region_name} (${d.undp_region})`)

	const countries_menu = cartouche.select('menu.f-countries')
	.addElems('li', 'country', countries)
	
	countries_menu.addElems('input')
		.attrs({
			'type': 'checkbox',
			'value': d => d.iso3,
			'id': d => d.iso3,
			'name': 'countries',
			'checked': d => basetags_params.getAll('countries').includes(d.iso3) || null
		})
	countries_menu.addElems('label')
		.attr('for', d => d.iso3)
	.html(d => `${d.country}`)

	// FOR HIGHLIGHTING
	// const countries_hmenu = cartouche.select('menu.h-countries')
	// .addElems('li', 'country', countries)
	
	// countries_hmenu.addElems('input')
	// 	.attrs({
	// 		'type': 'checkbox',
	// 		'value': d => d.iso3,
	// 		'id': d => `h-${d.iso3}`,
	// 		'name': 'countries',
	// 		'checked': d => highlighttags_params.getAll('h-countries').includes(d.iso3) || null
	// 	})
	// countries_hmenu.addElems('label')
	// 	.attr('for', d => `h-${d.iso3}`)
	// .html(d => `${d.country}`)

	const tags_hmenu = cartouche.select('menu.h-tags')
	.addElems('li', 'tag', tags)
	
	tags_hmenu.addElems('input')
		.attrs({
			'type': 'checkbox',
			'value': d => simplifyStr(d.name),
			'id': d => simplifyStr(d.name),
			'name': 'h-tags',
			'checked': d => highlighttags_params.getAll('h-tag').includes(simplifyStr(d.name)) || null
		})
	.on('change', function (d) {
		toggleHighlight(d.name, this.checked)
	})

	tags_hmenu.addElems('label')
		.attr('for', d => simplifyStr(d.name))
	.html(d => d.name)

	// INTERACTIVITY
	cartouche.selectAll('.filter input[type=text]')
	.on('keyup', function () {
		const node = this
		const dropdown = d3.select(node).findAncestor('filter').select('.dropdown')
		dropdown.selectAll('menu li')
			.classed('hide', function () {
				return !this.textContent.trim().toLowerCase()
				.includes(node.value.trim().toLowerCase())
			})
	}).on('focus', function () {
		const dropdown = d3.select(this).findAncestor('filter').select('.dropdown')
		let { top, height } = this.getBoundingClientRect()
		top = top + height
		const viewheight = window.innerHeight
		if (top + 300 >= viewheight) dropdown.classed('dropup', true)

		const filters = d3.select(this).findAncestor('filters')

		if (dropdown.node()) dropdown.node().style.maxHeight = `${Math.min(dropdown.node().scrollHeight, 300)}px`
		if (filters?.node()) filters.node().style.overflow = 'visible'

		dropdown.selectAll('label, a').on('mousedown', function () {
			d3.event.preventDefault()
		})
	}).on('blur', function () {
		const filter = d3.select(this).findAncestor('filter')
		const dropdown = filter.select('.dropdown')
		if (dropdown.node()) dropdown.node().style.maxHeight = null
	})
}

function displaySnippets (kwargs) {
	let { id, title, data, timeseries } = kwargs
	if (!Array.isArray(id)) id = [id]
	const container = d3.select('.right-col')
	.style('flex', '1 1 0')
	container.select('button.expand-filters').classed('close', true)

	const panel = container.addElems('div', 'inner')

	panel.addElems('h1', 'category', title ? [title] : [])
		.html(d => d)


	// DISPLAY STATS
	const stats = panel.addElems('div', 'stats')
	.addElems('div', 'stat', [ { key: 'Action learning plans', value: data.length }, { key: 'Countries', value: data.unique('country', true).length } ])
	.addElems('h1')
	.html(d => {
		return `${d.value}<br><small>${d.key}</small>`
	})

	// drawTimeSeries(timeseries)

	const pad = panel.addElems('article', 'pad', data)
	.on('mouseover', function (d) {
		// TO DO: EDIT THIS
		/*
		const tags = d.tags.filter(c => c.type === 'thematic_areas')
		const tag_ids = tags.map(c => c.tag_id)
		// DIM ALL NODES THAT ARE NOT IN THE PAD
		d3.selectAll('g.node--leaf circle')
		.filter(c => c.data.orid.intersection(tag_ids).length === 0)
		.classed('dimmed', true)

		d3.selectAll('.group-label')
		.classed('hide', true)

		d3.selectAll('.leaf-label')
		.classed('hide', c => c.data.orid.intersection(tag_ids).length === 0)

		drawPortfolio(tag_ids)
		*/

	}).on('mouseout', _ => {
		// UNDIM ALL NODES
		/* 
		d3.selectAll('g.node--leaf circle')
		.classed('dimmed', false)

		d3.selectAll('.group-label')
		.classed('hide', false)

		d3.selectAll('.leaf-label')
		.classed('hide', true)

		d3.selectAll('path.portfolio').remove()
		*/
	}).addElems('div', 'inner')

	const head = pad.addElems('hgroup', 'head')

	head.addElems('h1', 'title')
		.addElems('a')
	.attrs({
		'href': d => new URL(`en/view/pad?id=${d.pad_id}`, platform),
		'target': '_blank'
	}).html(d => d.title)
	head.addElems('p', 'country')
		.html(d => d.country)
	head.addElems('small', 'date')
		.html(d => {
			const date = new Date(d.created_at)
			const year = date.getFullYear()
			let month = date.getMonth() + 1
			if (month < 10) month = `0${month}`
			return `${year}-${month}`
		})
	head.addElems('div', 'tags', d => [d.tags.filter(c => c.type === 'sdgs').sort((a, b) => id.includes(a.key) && id.includes(b.key) ? a.key - b.key : id.includes(a.key) ? -1 : id.includes(b.key) ? 1 : 0)])
		.addElems('div', 'img-tag', d => d)
			.classed('main', d => id.includes(d.key))
			.style('background-color', d => sdgcolors[d.key - 1])
		.on('click', d => {
			d3.selectAll('svg g.node').filter(c => c.id === d.key).dispatch('click')
		}).on('mouseover', d => {
			if (!id.includes(d.key)) {
				d3.selectAll('svg g.node circle.color').filter(c => c.id === d.key)
				.attrs({
					'data-color': function () { return d3.select(this).style('fill') },
					'data-opacity': function () { return d3.select(this).style('fill-opacity') }
				}).styles({
					'fill': c => sdgcolors[c.id - 1],
					'fill-opacity': .75,
				});
			}
		}).on('mouseout', d => {
			if (!id.includes(d.key)) {
				d3.selectAll('svg g.node circle.color').filter(c => c.id === d.key)
				.each(function (c) {
					const sel = d3.select(this);
					const { color, opacity } = this.dataset;

					sel.styles({
						'fill': color,
						'fill-opacity': opacity,
					}).attrs({
						'data-color': null, // RESET
						'data-opacity': null, // RESET
					});
				});
			}
		})
		.addElems('img')
			.attr('src', d => `imgs/sdgs/G${d.key}-l.svg`)
		// .html(d => d.name?.length > 20 ? `${d.name?.slice(0, 20)}...` : d.name)

	const body = pad.addElems('div', 'body')
	body.addElems('img', 'vignette', d => d.media.slice(0, 1))
		.attr('src', d => d.replace('https:/', 'https://'))
	body.addElems('p', 'snippet', d => [d.snippet])
		.html(d => d)
}

function drawTimeSeries (data) {
	const panel = d3.select('.right-col .inner')
	const { clientWidth: cw, clientHeight: ch, offsetWidth: ow, offsetHeight: oh } = panel.node()
	const width = Math.round(Math.min(cw ?? ow, ch ?? oh))
	const height = Math.round(width * .25)
	const padding = 15

	const svg = panel.addElems('svg')
		.attrs({ 
			'id': 'timeseries',
			width,
			height
		})

	const x = d3.scaleTime()
		.domain(d3.extent(data, d => d.date))
		.range([ padding, width - padding ])
	const y = d3.scaleLinear()
		.domain(d3.extent(data, d => d.count))
		.range([ height - padding, padding ])
	const line = d3.line()
		// .curve(d3.curveMonotone)
		.x(d => x(d.date))
		.y(d => y(d.count))

	svg.addElems('path', 'timeseries', [data])
		.attr('d', line)
}

export function clearPanel () {
	const container = d3.select('.right-col')
	.style('flex', '0 1 0')
	container.select('button.expand-filters').classed('close', false)
	container.selectAll('.inner').remove()

	// RESET THE BUNDLE
	const svg = d3.select('svg')
	svg.selectAll('g.node circle.color')
	.styles({
		'fill': d => sdgcolors[d.id - 1],
		'fill-opacity': 1,
	});
	svg.selectAll('path.link')
	.styles({
		'stroke': colors['light-grey'],
		'stroke-opacity': .5,
	})

	// RESET THE MATRIX
	svg.selectAll('rect.cell')
	.style('stroke', 'none')
}

function drawPortfolio (data) {
	const points = data.map(d => {
		const circle = d3.selectAll('g.node--leaf').filter(c => c.data.orid.includes(d))
		if (circle.node()) return [ circle.datum().x, circle.datum().y ]
		else return null
	}).filter(d => d)

	svg.addElems('path', 'portfolio', [sortpolygon(points)])
		.attrs({
			'd': d => `M${d.join(' L')}`
		}).styles({
			'stroke': '#000',
			'fill': 'none'
		}).on('click', d => {
			// window.open(`https://acclabs-actionlearningplans.azurewebsites.net/en/edit/pad?id=${data.unique('pad', true)[0]}`, '_blank')
			window.open(`https://learningplans.sdg-innovation-commons.org/en/edit/pad?id=${data.unique('pad', true)[0]}`, '_blank')
		})
}


export const addLoader = function () {
	const ripple = d3.select('body').addElems('div', 'lds-default')
	ripple.addElems('div', 'filler', d3.range(12))
}
export const rmLoader = function () {
	d3.select('.lds-default').remove()
}
function expandfilters (node) {
	d3.select(node).toggleClass('close')
	const cartouche = d3.select(node).findAncestor('cartouche')
	const filters = cartouche.select('form').node()
	const padding = filters.querySelector('section').getBoundingClientRect().height / 2
	// WE NEED TO MANUALLY ADD THE BOTTOM PADDING BECAUSE IT IS NOT COMPUTED IN THE scrollHeight
	if (filters.style.maxHeight) {
		filters.style.maxHeight = null
		filters.style.overflow = 'hidden'
	} else {
		filters.style.maxHeight = `${filters.scrollHeight + padding}px`
		filters.style.overflow = 'visible'
	}
}

function highlightTag (value) {
	d3.selectAll('circle')
	.classed('highlight', d => value?.length && Object.keys(d.data).includes('orid') && d.data.clean[0].includes(value))
}
function toggleHighlight (value, highlight = true) {
	d3.selectAll('circle')
	.filter(d => value?.length && Object.keys(d.data).includes('orid') && d.data.clean[0].includes(value))
	.classed('highlight', highlight)
}