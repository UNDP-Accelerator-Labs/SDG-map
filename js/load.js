import './Array.prototype.extensions.js'
import { GET, platform } from './main.js'
import { bundle, matrix, addLoader, rmLoader, clearPanel } from './render.js'

function DOMLoad () {
	const { clientWidth: cw, clientHeight: ch, offsetWidth: ow, offsetHeight: oh } = d3.select('.left-col').node()
	const width = Math.round(Math.min(cw ?? ow, ch ?? oh))
	const height = width
	const padding = 60
	const edit_layout = false

	let display = 'bundle'

	const svg = d3.select('svg#bubbles')
	.attrs({ 
		'x': 0,
		'y':0,
		'viewBox': `0 0 ${width} ${height}`,
		'preserveAspectRatio': 'xMidYMid meet'
	})

	const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiNDVlMThiYzMtODgwNS00NWUxLThjNTQtYjM1NmJjZWU0OTEyIiwicmlnaHRzIjozLCJpYXQiOjE2OTk3MDQwOTksImF1ZCI6InVzZXI6a25vd24iLCJpc3MiOiJzZGctaW5ub3ZhdGlvbi1jb21tb25zLm9yZyJ9.vKYu1PcT5Z672GUOuxO4ux_E6MTd2PT-GPBgXPgXbl8'
	
	const tags_path = new URL('apis/fetch/tags', platform)
	const regions_path = new URL('apis/fetch/regions', platform)
	const countries_path = new URL('apis/fetch/countries', platform)

	const basetags_params = new URLSearchParams(tags_path.search)
	basetags_params.append('token', token)
	basetags_params.append('type', 'sdgs')
	let mobilization = 30

	const highlighttags_params = new URLSearchParams(basetags_params)
	new URLSearchParams(window.location.search).forEach((v, k) => {
		if (['countries'].includes(k)) basetags_params.append(k, v)
		if (['regions'].includes(k)) basetags_params.append(k, v)
		if (['mobilizations'].includes(k)) basetags_params.append(k, v) //mobilization = v
		if (k === 'display' && v === 'matrix') display = 'matrix'
	})
	if (!basetags_params.has('mobilizations')) basetags_params.append('mobilizations', mobilization)

	const regions_params = new URLSearchParams(regions_path)
	regions_params.append('token', token)
	const countries_params = new URLSearchParams(countries_path)
	countries_params.append('token', token)
	countries_params.append('has_lab', true)

	const data_collection = []
	data_collection.push(GET(`${tags_path.origin}${tags_path.pathname}?${basetags_params.toString()}`))
	data_collection.push(GET(`${regions_path.origin}${regions_path.pathname}?${regions_params.toString()}`))
	data_collection.push(GET(`${countries_path.origin}${countries_path.pathname}?${countries_params.toString()}`))
	data_collection.push(d3.json('data/taxonomy_manual_202311.json'))
	if (highlighttags_params.size >= 2) data_collection.push(GET(`${tags_path.origin}${tags_path.pathname}?${highlighttags_params.toString()}`))

	addLoader()


	// LOAD PADS
	const pads_path = new URL('apis/fetch/pads', platform)
	const pads_queryparams = new URLSearchParams(pads_path.search)
	pads_queryparams.append('output', 'json')
	pads_queryparams.append('token', token)

	// pads_queryparams.append('countries', 'json')
	if (basetags_params.getAll('mobilizations').length) {
		basetags_params.getAll('mobilizations').forEach(d => {
			pads_queryparams.append('mobilizations', d)
		})
	} else pads_queryparams.append('mobilizations', mobilization)
	pads_queryparams.append('include_imgs', true)
	pads_queryparams.append('include_tags', true)
	new URLSearchParams(window.location.search).forEach((v, k) => {
		if (['countries'].includes(k)) pads_queryparams.append(k, v)
		if (['regions'].includes(k)) pads_queryparams.append(k, v)

	})

	Promise.all([ GET(`${pads_path}?${pads_queryparams}`) ])
	.then(results => {
		const [ pads ] = results

		const nodes = pads.flat().map(d => {
			const sdgs = d.tags?.filter(c => c.type === 'sdgs').map(c => c.key)
			return sdgs.map(c => {
				return { sdg: c, pad: d.pad_id }
			})

		}).flat()
		.nest('sdg')
		.map(d => {
			return { id: d.key, count: d.count }
		})
		console.log(nodes)

		const links = []

		pads.flat().forEach(d => {
			const sdgs = d.tags?.filter(c => c.type === 'sdgs').map(c => c.key)
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

		if (display === 'matrix') matrix({ nodes, links, pads, svg, width, height, padding })
		else bundle({ nodes, links, pads, svg, width, height, padding })
		rmLoader()

	}).catch(err => console.log(err))

	// ADD BASE INTERACTION
	d3.select('.right-col .expand-filters')
	.on('click', clearPanel)
}

if (document.readyState === 'loading') {
	document.addEventListener("DOMContentLoaded", DOMLoad);
} else {
	DOMLoad();
}