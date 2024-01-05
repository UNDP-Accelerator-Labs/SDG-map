import { annotate, annotateBundle, matrix, bundle, bundleLegend, txtvars } from './render.js'
import { sdgcolors, colors } from './main.js'

let link_transition
let node_transition

export const intro = {
	bundle: [
		function (kwargs) {
			const { display, nodes, links, pads, svg, randomnode, width, height, padding, intersecting, prevstate } = kwargs
			if (intersecting && prevstate === 'hidden') {
				bundle({ nodes, links, pads, svg, width, height, padding })
			}
		},
		function (kwargs) {
			const { randomnode, nodes, width, height, intersecting, prevstate, dir } = kwargs
			if (intersecting) {
				d3.selectAll('g.node circle.color')
					.filter(d => d.id !== randomnode)
					.transition('node-fill')
					.style('fill', colors['light-grey'])

				annotateBundle({ id: randomnode, description: `Each node in this visualization represents one of the 17 Sustainable Development Goals (SDGs). In this case, SDG ${randomnode}: ${nodes.find(d => d.id === randomnode).name}.`, width, height })
			} else {
				if (prevstate === 'visible') {
					if (dir === 'up') {
						d3.selectAll('g.node circle.color')
							.transition('node-fill')
							.style('fill', d => sdgcolors[d.id - 1])
					}
					d3.select('g.annotation').remove()
				}
			}
		},
		function (kwargs) {
			const { nodes, svg, randomnode, width, height, padding, intersecting, prevstate, dir } = kwargs
			if (intersecting) {
				const counts = d3.selectAll('g.node').data().map(d => d.count).filter(d => d > 0)
				const min = Math.min(...counts)
				const max = Math.max(...counts)
				const maxsize = Math.max(...d3.selectAll('g.node').data().map(d => d.r))

				const clone = d3.selectAll('svg g.node').filter(c => c.id === randomnode)
				.select('circle.color')
				.classed('clone', true)
				
				d3.selectAll('g.node *:not(.clone), path.link, g.sdg-id')
				.transition('hide-vis')
				.style('opacity', 0)

				// MOVE THE LEGEND IN
				const legend = bundleLegend({ nodes, svg, width, height, padding })
				.attr('transform', `translate(${[ width / 2, height / 2 ]})`)
				.style('opacity', 1)
				legend.selectAll('text').style('opacity', 0)
				const pos = legend.selectAll('circle').data()
				
				clone.transition('center-node')
				.duration(1000)
				.attrs({
					'r': 30,
					'transform': d => `translate(${[ -(d.pos[0] - width / 2), -(d.pos[1] - height / 2) ]})`,
					'cx': -pos[0] - 10,
				}).on('end', function () {
					// TWEEN TEXT
					const tweentext = d3.select('svg')
					.addElems('text', 'counter')
						.attrs({
							'x': -pos[0] - 10,
							'font-size': txtvars.fontsize,
							'font-weight': 'bold',
							'dy': txtvars.fontsize * .3,
							'transform': `translate(${[ width / 2, height / 2 ]})`
						}).style('fill', '#FFF')

					function expand () {
						d3.select(this).transition('expand')
						.duration(3000)
						.attrs({
							'r': 60,
							'cx': pos[1] + 10
						}).on('end', contract)

						tweentext.transition('count')
						.duration(3000)
						.attr('x', pos[1] + 10)
						.tween('text', () => {
							const interpolator = d3.interpolateNumber(min, max)
							return function (t) {
								d3.select(this).text(Math.round(interpolator(t))) 
							}
						})
					}
					function contract () {
						d3.select(this).transition('expand')
						.duration(3000)
						.attrs({
							'r': 30,
							'cx': -pos[0] - 10,
						}).on('end', expand)

						tweentext.transition('count')
						.duration(3000)
						.attr('x', -pos[0] - 10)
						.tween('text', () => {
							const interpolator = d3.interpolateNumber(max, min)
							return function (t) {
								d3.select(this).text(Math.round(interpolator(t))) 
							}
						})
					}
					expand.call(this)
				})

				annotate({ description: 'The size of each node shows the number of action learning activities related to the given SDG.', width, height, pos: [width / 2, height / 2 + maxsize + txtvars.fontsize * txtvars.dy * 2] })
			} else {
				if (prevstate === 'visible') {
					// REMOVE COUNTER TEXT
					d3.select('text.counter').remove()
					// REMOVE THE ANNOTATION
					d3.selectAll('g.annotation').remove()
					// REMOVE CLONE
					d3.selectAll('circle.clone')//.remove()
					.interrupt('expand')
					.transition('center-node')
					.duration(1000)
					.attrs({
						'r': d => d.r,
						'transform': `translate(0,0)`,
						'cx': 0,
					}).on('end', function () { d3.select(this).classed('clone', false) })

					d3.selectAll('g.node *, path.link, g.sdg-id')
					.transition('hide-vis')
					.duration(500)
					.delay(500)
					.style('opacity', 1)

					d3.selectAll('g.node').filter(d => d.id !== randomnode)
					.transition('hide-nodes')
					.duration(0)
					.style('opacity', 1)

					if (dir === 'down') {
						// REPLACE LEGEND
						const legend = d3.select('g.legend')
						legend.transition('show-legend')
						.duration(1000)
						.attr('transform', `translate(${[ width, height - padding * 2 ]})`)
						legend.selectAll('text')
						.transition('show-text')
						.duration(1000)
						.style('opacity', 1)
					} else {
						// REPLACE LEGEND
						d3.select('g.legend')
						.transition('show-legend')
						.duration(1000)
						.style('opacity', 0)
					}
				}
			}
		},
		function (kwargs) {
			const { randomnode, intersecting, links, width, height, prevstate, dir } = kwargs
			if (intersecting) {
				d3.selectAll('g.node').filter(d => d.id !== randomnode)
				.transition('hide-nodes')
				.duration(0)
				.style('opacity', 0)

				d3.selectAll('path.link')
				.transition('highlight-link')
				.duration(1000)
				.styles({
					'opacity': 1,
					'stroke': c => {
						if (c.source === randomnode || c.target === randomnode) return sdgcolors[randomnode - 1];
						else return colors['light-grey'];
					},
					'stroke-opacity': c => {
						if (c.source === randomnode || c.target === randomnode) return .5;
						else return .05;
					},
				})

				const randombis = links.filter(d => d.source === randomnode).shuffle()
				const annotation = annotate({ description: `The thickness of each line indicates how SDGs are \nconnected in the work of the Accelerator Labs. \nFor example, SDGs\xa0${randomnode} and ${randombis[0].target} are connected in ${randombis[0].count} action learning activities.`, width, height, pos: [width / 2 + width * .4, height / 2] })
			} else {
				if (prevstate === 'visible') {
					if (dir === 'up') {
						d3.selectAll('path.link')
						.transition('highlight-links')
						.duration(500)
						.styles({
							'stroke': colors['light-grey'],
							'stroke-opacity': .5,
						})
					}
					d3.selectAll('.annotation').remove()
				}
			}
		},
		function (kwargs) {
			const { randomnode, width, height, intersecting, prevstate, dir } = kwargs
			if (intersecting) {
				d3.selectAll('g.node').filter(d => d.id !== randomnode)
				.transition('hide-nodes')
				.duration(0)
				.style('opacity', 0)

				d3.selectAll('path.link')
				.transition('highlight-link')
				.duration(0)
				.styles({
					'opacity': 1,
					'stroke': c => {
						if (c.source === randomnode || c.target === randomnode) return sdgcolors[randomnode - 1];
						else return colors['light-grey'];
					},
					'stroke-opacity': c => {
						if (c.source === randomnode || c.target === randomnode) return .5;
						else return .05;
					},
				})

				annotateBundle({ id: randomnode, description: 'Clicking on a node reveals excerpts of the related action learning activities.', width, height })
			}
			else {
				if (prevstate === 'visible') {
					if (dir === 'down') {
						d3.selectAll('g.node')
							.transition('hide-nodes')
							.duration(1000)
							.style('opacity', 1)
					}

					d3.select('g.annotation').remove()
				}
			}
		},
		function (kwargs) {
			const { randomnode, intersecting, prevstate } = kwargs
			if (intersecting) d3.selectAll('svg g.node').filter(c => c.id === randomnode).dispatch('click')
			else {
				if (prevstate === 'visible') {
					d3.select('.container .right-col .expand-filters.close').node()?.click()
				}
			}
		},
		function (kwargs) {
			const { randomnode, links, intersecting, width, height, prevstate, dir } = kwargs
			
			if (intersecting) {
				// DIM ALL OTHER NODES
				const connections = d3.selectAll('path.link').data().filter(c => c.source === randomnode || c.target === randomnode);
				const maxConnections = Math.max(...connections.map(c => c.count))

				d3.selectAll('g.node circle.color')
				.transition('refill-nodes')
				.duration(0)
				.styles({
					'fill': c => {
						if (c.id === randomnode) return sdgcolors[randomnode - 1];
						else {
							if (connections.some(b => b.source === c.id || b.target === c.id)) {
								return colors['light-grey'];
							} else return colors['light-2'];
						}
					},
					'fill-opacity': c => {
						if (c.id === randomnode) return 1;
						else if (connections.some(b => b.source === c.id || b.target === c.id)) {
							return (connections.find(b => b.source === c.id || b.target === c.id)?.count ?? 0) / maxConnections;
						} else return .5;
					}
				});

				d3.selectAll('path.link')
				.styles({
					'opacity': 1,
					'stroke': c => {
						if (c.source === randomnode || c.target === randomnode) return sdgcolors[randomnode - 1];
						else return colors['light-grey'];
					},
					'stroke-opacity': c => {
						if (c.source === randomnode || c.target === randomnode) return .5;
						else return .05;
					},
				});

				const linkednodes = links.filter(d => d.source === randomnode || d.target === randomnode).map(d => {
					if (d.source === randomnode) return d.target
					else if (d.target === randomnode) return d.source
				})
				const randombis = linkednodes[Math.floor(Math.random() * linkednodes.length)]
				annotateBundle({ id: randombis, description: 'The opacity of other nodes further indicates how connected they are to the selected SDG in the activities of the Accelerator Labs Network.', width, height })
			} else {
				if (prevstate === 'visible') {
					if (dir === 'down') {
						d3.selectAll('g.node circle.color')
						.transition('refill-nodes')
						.duration(1000)
						.style('fill-opacity', 1)

						d3.selectAll('path.link')
						.transition('highlight-links')
						.duration(500)
						.styles({
							'stroke': colors['light-grey'],
							'stroke-opacity': .5,
						})
					}

					d3.selectAll('g.annotation').remove()
				}
			}
		},
		function (kwargs) {
			const { width, height, padding, intersecting, prevstate, dir } = kwargs

			if (intersecting) {
				d3.selectAll('g.node circle.color')
				.transition('refill-nodes')
				.duration(1000)
				.styles({
					'fill-opacity': 1,
					'fill': d => sdgcolors[d.id - 1],
				})

				d3.select('.cartouche button.expand-filters').classed('highlight', true)
				annotate({ description: 'Clicking on the menu icon open a list of filters.', width, height, pos: [0, height - padding - txtvars.fontsize * txtvars.dy * 2] })
			} else {
				d3.selectAll('g.annotation').remove()

				if (dir === 'up') {
					d3.select('.cartouche button.expand-filters').classed('highlight', false)
				}
			}
		},
		function (kwargs) {
			const { randomnode, intersecting, prevstate, dir } = kwargs

			if (intersecting) {
				d3.select('.cartouche button.expand-filters')
				.classed('highlight', true)
				.node().click()
			} else {
				if (prevstate === 'visible') {
					d3.select('.cartouche button.expand-filters').node().click()
					
					if (dir === 'down') {
						d3.select('.cartouche button.expand-filters').classed('highlight', false)
					}
				}
			}
		},
	],
	matrix: [
		function (kwargs) {
			const { display, nodes, links, pads, svg, randomnode, width, height, padding, intersecting, prevstate } = kwargs
			if (intersecting && prevstate === 'hidden') {
				matrix({ nodes, links, pads, svg, width, height, padding })
			}
		},	
	]
}