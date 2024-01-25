import './Array.prototype.extensions.js'
import { GET, platform } from './main.js'
import { bundle, matrix, addLoader, rmLoader, clearPanel, expandFilters, renderMenu } from './render.js'
import { intro } from './intro.js'

function DOMLoad () {
	let display = 'bundle'
	const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiNDVlMThiYzMtODgwNS00NWUxLThjNTQtYjM1NmJjZWU0OTEyIiwicmlnaHRzIjozLCJpYXQiOjE2OTk3MDQwOTksImF1ZCI6InVzZXI6a25vd24iLCJpc3MiOiJzZGctaW5ub3ZhdGlvbi1jb21tb25zLm9yZyJ9.vKYu1PcT5Z672GUOuxO4ux_E6MTd2PT-GPBgXPgXbl8'
	let mobilization = 32
	
	addLoader()
	// LOAD PADS
	const pads_path = new URL('apis/fetch/pads', platform)
	const pads_queryparams = new URLSearchParams(pads_path.search)
	pads_queryparams.append('output', 'json')
	pads_queryparams.append('token', token)
	// INCLUDE IMAGES AND TAGS
	pads_queryparams.append('include_imgs', true)
	pads_queryparams.append('include_tags', true)
	pads_queryparams.append('include_source', true)
	pads_queryparams.append('status', 2)
	
	// FILTER MOBILIZATIONS
	// pads_queryparams.append('countries', 'json')
	let f_regions = []
	let f_countries = []
	new URLSearchParams(window.location.search).forEach((v, k) => {
		if (['countries'].includes(k)) {
			pads_queryparams.append(k, v)
			f_countries.push(v)
		}
		if (['regions'].includes(k)) {
			pads_queryparams.append(k, v)
			f_regions.push(v)
		}
		if (['mobilizations'].includes(k)) pads_queryparams.append(k, v)
		if (k === 'display' && v === 'matrix') display = 'matrix'
	})
	if (!pads_queryparams.has('mobilizations')) pads_queryparams.append('mobilizations', mobilization)

	// LOAD FILTERS
	// REGIONS
	const regions_path = new URL('apis/fetch/regions', platform)
	const regions_params = new URLSearchParams(regions_path)
	regions_params.append('token', token)
	// COUNTRIES
	const countries_path = new URL('apis/fetch/countries', platform)
	const countries_params = new URLSearchParams(countries_path)
	countries_params.append('token', token)
	countries_params.append('has_lab', true)

	// BUILD THE PROMISES
	const data_collection = []
	if (window.location.hostname === 'localhost') {
		data_collection.push(d3.json('/data/local.data.json'))
		data_collection.push(d3.json('/data/local.regions.json'))
		data_collection.push(d3.json('/data/local.countries.json'))
	} else {
		data_collection.push(GET(`${pads_path}?${pads_queryparams}`))
		data_collection.push(GET(`${regions_path}?${regions_params}`))
		data_collection.push(GET(`${countries_path}?${countries_params}`))
	}
	
	Promise.all(data_collection)
	// FOR LOCAL
	.then(results => {
		const [ pads, regions, countries ] = results
		countries_params.sort((a, b) => a.country.localeCompare(b.country))

		console.log(pads)
		
		d3.selectAll('section, div.container, a.navigation').classed('hide', false)
		// SET UP THE DISPLAY VARIABLES
		const { clientWidth: cw, clientHeight: ch, offsetWidth: ow, offsetHeight: oh } = d3.select('.left-col').node()
		const width = Math.round(Math.min(cw ?? ow, ch ?? oh))
		const height = width
		const padding = 60
		const edit_layout = false

		const svg = d3.select('svg#main-vis')
		.attrs({ 
			'x': 0,
			'y':0,
			'viewBox': `0 0 ${width} ${height}`,
			'preserveAspectRatio': 'xMidYMid meet'
		})

		const subtitle = d3.selectAll('h2.subtitle')
		if (countries.length) subtitle.html(countries.filter(d => f_countries.includes(d.iso3)).map(d => d.country).join('\n'))
		else if (regions.length) subtitle.html(regions.filter(d => f_regions.includes(d.undp_region)).map(d => d.undp_region_name).join('\n'))

		let nodes = pads.flat().map(d => {
			let tags = d.tags
			console.log(d)
			if (!tags.some(c => c.type === 'sdgs') && d.source.tags?.some(c => c.type === 'sdgs')) tags = d.source.tags
			
			const sdgs = tags?.filter(c => c.type === 'sdgs').map(c => { return { key: c.key, name: c.name } })
			return sdgs.map(c => {
				return { sdg: c.key, pad: d.pad_id, name: c.name }
			})
		}).flat()
		.nest('sdg', ['name'])
		.map(d => {
			return { id: d.key, count: d.count, name: d.name }
		})
		if (nodes.length < 17) {
			const sdg_fill = new Array(17).fill(0).map((d, i) => i + 1)
			.filter(d => !nodes.some(c => c.id === d))
			.map(d => { return { id: d, count: 0 } })
			nodes = nodes.concat(sdg_fill)
			nodes.sort((a, b) => a.id - b.id)
		}
		console.log(nodes)

		const links = []

		pads.flat().forEach(d => {
			let tags = d.tags
			if (!tags.some(c => c.type === 'sdgs') && d.source.tags?.some(c => c.type === 'sdgs')) tags = d.source.tags

			const sdgs = tags?.filter(c => c.type === 'sdgs').map(c => c.key)
			sdgs.forEach(c => {
				const connections = sdgs.filter(b => b !== c)
				connections.forEach(b => {
					if (links.some(a => {
						return (a.source === c && a.target === b) ||
						(a.source === b && a.target === c)
					})) {
						const link = links.find(a => {
							return (a.source === c && a.target === b) ||
							(a.source === b && a.target === c)
						})
						link.count ++
					} else {
						links.push({ source: c, target: b, count: 1 })
					}
				})
			})
		})
		console.log(links)

		rmLoader()
		renderMenu({ regions, countries })

		// OBSERVE THE SCROLL BEHAVIOR
		// CREDIT: https://stackoverflow.com/questions/16302483/event-to-detect-when-positionsticky-is-triggered
		const introslides = d3.selectAll('.intro')
		// const randomnode = Math.floor(Math.random() * 4) + 3
		const randomnode = (nodes.filter(d => d.count > 0 && d.id > 1 && d.id < 9).shuffle()[0]?.id || nodes.filter(d => d.count > 0).shuffle()[0]?.id)

		const observer = new IntersectionObserver( 
			(entries) => {
				entries.forEach((e, o) => {
					const { target, isIntersecting } = e
					let { prevstate, step } = target.dataset
					const { top } = e.boundingClientRect
					const dir = top < 0 ? 'down' : 'up'
					intro[display][step - 1]?.({ display, nodes, links, pads, svg, randomnode, width, height, padding, intersecting: isIntersecting, prevstate, dir })
					
					if (e.isIntersecting) prevstate = 'visible'
					else if (+step !== 1) prevstate = 'hidden'
					d3.select(target).attr('data-prevstate', prevstate)
				})
			},
			{ threshold: [0.5, 1], root: null, rootMargin: '0px' }
		);

		introslides.each(function () { observer.observe(this) })

	}).catch(err => console.log(err))

	// ADD BASE INTERACTION
	d3.select('.right-col .expand-filters')
	.on('click', clearPanel)
	d3.select('.cartouche .expand-filters')
	.on('click', function () { expandFilters(this) })
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', DOMLoad);
} else {
	DOMLoad();
}
