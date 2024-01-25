import './d3.prototype.extensions.js'
import './Array.prototype.extensions.js'
import './String.prototype.extensions.js'
import { platform, getCoordinates, sdgcolors, colors, chunk } from './main.js'

export const txtvars = { fontsize: 12, dy: 1.3 }
export const titlevars = { fontsize: 18, dy: 1.3 }

export function bundle (kwargs) {
	const { nodes, links, pads, svg, width, height, padding } = kwargs

	const nodeScale = d3.scaleLinear()
		.domain(d3.extent(nodes.filter(d => d.count > 0), d => d.count))
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
		.classed('hide', d => d.count === 0)
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
			let tags = c.tags
			if (!tags.some(b => b.type === 'sdgs' && b.key === d.id) && c.source.tags.some(b => b.type === 'sdgs' && b.key === d.id)) tags = c.source.tags
			return tags?.some(b => b.type === 'sdgs' && b.key === d.id)
		})
		const title = associated_pads.map(c => {
			let tags = c.tags
			if (!tags.some(b => b.key === d.id) && c.source.tags.some(b => b.key === d.id)) tags = c.source.tags
			return tags.filter(b => b.key === d.id)
		}).flat().unique('key')[0].name

		displaySnippets({ id: d.id, title: `SDG ${d.id}: ${title}`, data: associated_pads });
	});
	node.addElems('circle', 'blank')
		.attrs({ 
			'r': d => d.r = nodeScale(d.count)
		})
		.style('fill', '#FFF');
	node.addElems('circle', 'color')
		.attrs({ 
			'r': d => d.r = nodeScale(d.count), 
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
			d.pos = getCoordinates(angle, .3, width, height)
			return `translate(${d.pos})`
		})

	const sdg_ids = g.addElems('g', 'sdg-id', nodes.sort((a, b) => a.id - b.id))
		.attr('transform', d => {
			const angle = 360 * (d.id - 1) / nodes.length
			const pos = getCoordinates(angle, .3, width, height, nodeScale(d.count) + 15)
			return `translate(${pos})`
		}).styles({
			'text-anchor': d => {
				const angle = 360 * (d.id - 1) / nodes.length
				if (angle > 180) return 'end'
				else return 'start'
			}, 'fill': d => sdgcolors[d.id - 1],
		}).addElems('text')
		.text(d => d.id)

	// annotate(pads)
}

export function bundleLegend (kwargs) {
	const { nodes, svg, width, height, padding } = kwargs
	const range = [30, 60]
	// LEGEND
	const legend = svg.select('g').addElems('g', 'legend')
		.attr('transform', `translate(${[ width, height - padding * 2 ]})`)
	const circles = legend.addElems('circle', 'scales', range)
	.attrs({
		'r': 0,
		'cx': (d, i) => {
			if (i === 0) return -d - 10
			else return d + 10
		}
	}).styles({
		'stroke': colors['light-grey'],
		'stroke-dasharray': '2 2',
		'fill': 'none',
	})
	circles.transition('animate-circle-in')
	.duration(1000)
	.delay((d, i) => i * 250)
	.attr('r', d => d)
	
	legend.addElems('text', 'extremum', d3.extent(nodes.filter(d => d.count > 0), d => d.count).zip(range))
	.attrs({
		'x': (d, i) => {
			if (i === 0) return -d[1] - 10
			else return d[1] + 10
		},
		'font-size': txtvars.fontsize,
		'dy': txtvars.fontsize * .3,
	}).text(d => d[0])
	
	const line = legend.addElems('line', null, [range])
	.attrs({
		'x1': d => -d[0] - 10,
		'y1': 0,
		'x2': d => -d[0] - 10,
		'y2': 0,
	}).styles({
		'stroke': colors['light-grey'],
		'stroke-dasharray': '2 2',
		'fill': 'none',
	})
	line.transition('animate-line-in')
	.duration(500)
	.attr('x2', d => d[1] + 10)

	return legend
}

export function matrix (kwargs) {
	const { nodes, links, pads, svg, width, height, padding } = kwargs
	const cellsize = Math.min(width * .8, height * .8) / (nodes.length + 1)

	nodes.sort((a, b) => a.id - b.id)

	const nodeScale = d3.scaleLinear()
		.domain(d3.extent(nodes, d => d.count))
		.range([cellsize * .75, cellsize * 3])
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
	column_headers.addElems('text')
		.attrs({
			'x': cellsize / 2,
			'y': -cellsize / 2,
			'dy': '.3em',
		}).styles({
			'font-size': txtvars.fontsize,
			'text-anchor': 'middle',
			'fill': d => sdgcolors[d.id - 1],
		}).text(d => d.id)
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
	row_headers.addElems('text')
		.attrs({
			'x': -cellsize / 2,
			'y': cellsize / 2,
			'dy': '.3em',
		}).styles({
			'font-size': txtvars.fontsize,
			'text-anchor': 'middle',
			'fill': d => sdgcolors[d.id - 1],
		}).text(d => d.id)
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

	const cells = g.addElems('g', 'row', nodes)
		.attr('transform', (d, i) => `translate(${[0, i * cellsize]})`)
	.addElems('g', 'cell', d => {
		return nodes.map(c => {
			const obj = Object.assign({}, c)
			obj.adjacent = d.id
			obj.count = links.find(b => (b.source === d.id && b.target === c.id) || (b.source === c.id && b.target === d.id))?.count ?? 0
			return obj
		})
	}).attr('transform', (d, i) => `translate(${[i * cellsize, 0]})`)

	cells.addElems('rect', 'cell')
	.attrs({
		'width': cellsize,
		'height': cellsize,
	})
	.styles({
		'fill': colors['mid-grey'],
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
			.addElems('text', 'count highlight')
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

		d3.selectAll('.cell text.count.highlight').remove()
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

	cells.addElems('text', 'count', d => {
		// DISPLAY COUNT
		const associated_pads = pads.flat().filter(c => {
			return c.tags?.some(b => b.type === 'sdgs' && b.key === d.id) && c.tags?.some(b => b.type === 'sdgs' && b.key === d.adjacent)
		}).length

		if (d.id !== d.adjacent) return [associated_pads]
		else return []
	}).attrs({
		'x': (d, i) => i * cellsize + cellsize / 2,
		'y': cellsize / 2,
		'dy': '.3em'
	}).styles({
		'fill': '#FFF'
	})
	.text(d => d)

	// ADD MARGINALS
	const marginals = g.addElems('g', 'marginal', nodes)
		.attr('transform', (d, i) => `translate(${[cellsize * nodes.length, i * cellsize]})`)
	marginals.addElems('rect')
		.attrs({
			'width': d => nodeScale(d.count),
			'height': cellsize,
		}).style('fill', d => sdgcolors[d.id - 1]);
	marginals.addElems('text', 'count')
		.attrs({
			'x': d => nodeScale(d.count) - 7.5,
			'y': cellsize / 2,
			'dy': '.3em'
		}).styles({
			'font-size': txtvars.fontsize,
			'text-anchor': 'end',
			'fill': '#FFF',
		}).html(d => d.count)

}

export function annotate (kwargs) {
	let { title, description, width, height, pos } = kwargs

	const annotation = d3.select('svg > g').addElems('g', 'annotation', _ => {
		let tlines = []
		if (title) {
			title = title.split(/[\s\n]/g)
			tlines = chunk(title, 3)
		}

		let lines = []
		if (description) {
			description = description.split(/[\s\n]/g)
			lines = chunk(description, 5)
		}

		const anchor = 'start'
		if (!pos) pos = [width / 2, height / 2]
		return [{ tlines, lines, anchor, pos }]
	}).attr('transform', d => `translate(${d.pos})`)

	const titlespan = annotation.addElems('text', 'title')
		.addElems('tspan', null, d => {
			return d.tlines.map(c => {
				return { line: c, anchor: d.anchor }
			})
		}).attrs({
			'x': 0,
			'dy': titlevars.fontsize * titlevars.dy,
		}).styles({
			'font-size': `${titlevars.fontsize}px`,
			'font-weight': 'bold',
			'text-anchor': d => d.anchor,
			'fill': colors['mid-grey'],
		})
		.text(d => d.line.join(' '))
	const textspan = annotation.addElems('text', 'description')
		.attr('transform', d => {
			if (d.tlines?.length) {	
				return `translate(0, ${d.tlines.length * titlevars.fontsize * titlevars.dy + txtvars.fontsize * txtvars.dy * .5})`
			} else {
				return `translate(0, ${-txtvars.fontsize * txtvars.dy})`
			}
		}).addElems('tspan', null, d => {
			return d.lines.map(c => {
				return { line: c, anchor: d.anchor }
			})
		}).attrs({
			'x': 0,
			'dy': txtvars.fontsize * txtvars.dy,
		}).styles({
			'text-anchor': d => d.anchor,
			'fill': colors['mid-grey'],
			'opacity': 0,
		}).text(d =>  d.line.join(' '))
	textspan.transition()
		.duration(500)
		.delay((d, i) => 250 + i * 10)
		.style('opacity', 1)

	return annotation
}

export function annotateBundle (kwargs) {
	let { id, title, description, width, height } = kwargs

	const g = d3.select('svg > g')
	const nodes = g.selectAll('g.node')
	const highlightnode = nodes.filter(d => d.id === id).select('circle.color')
	const highlight_r = +highlightnode.attr('r') + 10
	const or_angle = 360 * (id - 1) / nodes.size()
	const or_pos = getCoordinates(or_angle, .3, width, height)
	const or_padding = getCoordinates(or_angle, .3, width, height, highlight_r)

	const annotation = g.addElems('g', 'annotation', _ => {
		let tlines = []
		if (title) {
			title = title.split(/[\s\n]/g)
			tlines = chunk(title, 3)
		}

		let lines = []
		if (description) {
			description = description.split(/[\s\n]/g)
			lines = chunk(description, 5)
			// if (lines.length > 5) {
			// 	lines = lines.slice(0, 5)
			// 	lines.push(['...'])
			// }
		}

		const angle = (360 * id / nodes.size()) // TO DO: DOES THIS NEED TO BE id - 1?
		let anchor = 'start'
		if (angle > 180) anchor = 'end'
		const p_angle = 360 * (id - 1) / nodes.size()
		let linepos = getCoordinates(p_angle, .4, width, height, -10)
		let pos = getCoordinates(p_angle, .4, width, height)
		if (angle < 90 || angle > 270) {
			linepos[1] -= (txtvars.fontsize * txtvars.dy * (lines.length + .5)) + (titlevars.fontsize * titlevars.dy * tlines.length)
			pos[1] -= (txtvars.fontsize * txtvars.dy * (lines.length + .5)) + (titlevars.fontsize * titlevars.dy * tlines.length)
		}
		return [{ id, pos, linepos, anchor, lines, tlines }]
	}).attr('transform', d => `translate(${d.pos})`)
	const circle = annotation.addElems('circle')
		.attrs({
			'cx': d => -(d.pos[0] - or_pos[0]),
			'cy': d => -(d.pos[1] - or_pos[1]),
			'r': 0,
		}).styles({
			'stroke': colors['mid-yellow'],
			'stroke-width': 2,
			'fill': 'none',
		})
	circle.transition()
		.ease(d3.easeElasticOut.amplitude(1).period(0.3))
		.duration(1000)
		.attr('r', +highlightnode.attr('r') + 10)
	// THE FOLLOWING IS THE CLIP PATH FOR THE LINE
	const clipPath = annotation.addElems('mask')
		.attr('id', 'clip')
	clipPath.addElem('circle')
		.attrs({
			'cx': d => -(d.pos[0] - or_pos[0]),
			'cy': d => -(d.pos[1] - or_pos[1]),
			'r': +highlightnode.attr('r') + 100,
		}).style('fill', '#FFF')
	clipPath.addElem('circle')
		.attrs({
			'cx': d => -(d.pos[0] - or_pos[0]),
			'cy': d => -(d.pos[1] - or_pos[1]),
			'r': +highlightnode.attr('r') + 10,
		}).style('fill', '#000')
	const line = annotation.addElems('line')
		.attrs({
			'x1': d => -(d.pos[0] - or_pos[0]),
			'y1': d => -(d.pos[1] - or_pos[1]),
			'x2': d => -(d.pos[0] - or_pos[0]),
			'y2': d => -(d.pos[1] - or_pos[1]),
			'mask': 'url(#clip)',
		}).styles({
			'stroke': colors['mid-yellow'],
			'stroke-width': 2,
			'fill': 'none',
		})
	line.transition()
		.duration(500)
		.attrs({
			'x2': d => d.linepos[0] - d.pos[0],
			'y2': d => d.linepos[1] - d.pos[1],
		})

	const titlespan = annotation.addElems('text', 'title')
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
	const textspan = annotation.addElems('text', 'description')
		.attr('transform', d => {
			if (d.tlines?.length) {	
				return `translate(0, ${d.tlines.length * titlevars.fontsize * titlevars.dy + txtvars.fontsize * txtvars.dy * .5})`
			} else {
				return `translate(0, ${-txtvars.fontsize * txtvars.dy})`
			}
		}).addElems('tspan', null, d => {
			return d.lines.map(c => {
				return { line: c, anchor: d.anchor }
			})
		}).attrs({
			'x': 0,
			'dy': txtvars.fontsize * txtvars.dy,
		}).styles({
			'text-anchor': d => d.anchor,
			'fill': colors['mid-grey'],
			'opacity': 0,
		}).text(d =>  d.line.join(' '))
	textspan.transition()
		.duration(500)
		.delay((d, i) => 250 + i * 10)
		.style('opacity', 1)
}

export function renderMenu (kwargs) {
	let { regions, countries, tags } = kwargs
	// ADD THE mobilizations VALUES FOR NOW AS WE DO NOT ENABLE SELECTION YET
	const cartouche = d3.select('.cartouche')
	const form = cartouche.select('form')

	const base_params = new URLSearchParams(window.location.search)
	form.addElems('input', 'mobilizations', base_params.getAll('mobilizations'))
		.attrs({
			'type': 'hidden',
			'name': 'mobilizations',
			'value': d => d
		})

	// ADD THE DROPDOWNS
	// FOR FILTERING
	if (regions?.length) {
		regions.sort((a, b) => a.undp_region.localeCompare(b.undp_region))

		const regions_menu = cartouche.select('menu.f-regions')
		.addElems('li', 'region', regions)
	
		regions_menu.addElems('input')
			.attrs({
				'type': 'checkbox',
				'value': d => d.undp_region,
				'id': d => d.undp_region,
				'name': 'regions',
				'checked': d => base_params.getAll('regions').includes(d.undp_region) || null
			})
		regions_menu.addElems('label')
			.attr('for', d => d.undp_region)
		.html(d => `${d.undp_region_name} (${d.undp_region})`)
	} else cartouche.select('menu.f-regions')

	if (countries?.length) {
		countries = countries.filter(d => {
			if (base_params.getAll('regions').length) return d.has_lab && base_params.getAll('regions').includes(d.undp_region)
			else return d.has_lab
		})

		const countries_menu = cartouche.select('menu.f-countries')
		.addElems('li', 'country', countries)
		
		countries_menu.addElems('input')
			.attrs({
				'type': 'checkbox',
				'value': d => d.iso3,
				'id': d => d.iso3,
				'name': 'countries',
				'checked': d => base_params.getAll('countries').includes(d.iso3) || null
			})
		countries_menu.addElems('label')
			.attr('for', d => d.iso3)
		.html(d => `${d.country}`)
	} else cartouche.select('menu.f-countries').remove()

	if (tags?.length) {
		tags.sort((a, b) => a.name?.localeCompare(b.name))

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
	} else cartouche.select('menu.h-tags').remove()

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
		}).addElems('img')
			.attr('src', d => `imgs/sdgs/G${d.key}-l.svg`)
		// .html(d => d.name?.length > 20 ? `${d.name?.slice(0, 20)}...` : d.name)

	const body = pad.addElems('div', 'body')
	body.addElems('img', 'vignette', d => [d.vignette || d.source.vignette].filter(c => c))
		.attr('src', d => d.replace('https:/', 'https://'))
	body.addElem('h2', 'source-title')
		.html('Challenge statement')
	body.addElems('p', 'snippet', (d) => {
		return d.source.snippet?.toString()
		.split('\n')
		.filter((c) => c)
	}).html((d) => {
		return d.URLsToLinks()
	})
	body.addElem('h2', 'source-title')
		.html('Key learnings')
	body.addElems('p', 'snippet', (d) => {
		return d.snippet?.toString()
		.split('\n')
		.filter((c) => c)
	}).html((d) => {
		return d.URLsToLinks()
	})
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
export function expandFilters (node) {
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