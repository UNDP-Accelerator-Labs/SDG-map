const jsonQueryHeader = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
export const new_api = false;

let endpoint = '';
if (new_api) endpoint = new URL('https://staging.sdg-innovation-commons.org');
else endpoint = new URL('https://learningplans.sdg-innovation-commons.org');
export const platform = endpoint;

export function POST (_uri, _q, _expectJSON = true) {
	return new Promise(resolve => 
		fetch(_uri, { method: 'POST', headers: jsonQueryHeader, body: JSON.stringify(_q) })
			.then(response => {
				if (_expectJSON) return response.json()
				else return response
			})
			.then(results => resolve(results))
			.catch(err => { if (err) throw (err) })
	)
}
export function GET (_uri, _expectJSON = true) {
	return new Promise(async resolve => {
		fetch(_uri, { method: 'GET', headers: jsonQueryHeader })
			.then(response => {
				if (_expectJSON) return response.json()
				else return response
			})
			.then(results => resolve(results))
			.catch(err => { if (err) throw (err) })
	})
}

export const simplifyStr = function (st) {
	if (!str) return undefined;
	else return str.trim().replace(/[^\w\s]/gi, '').replace(/\s/g, '').toLowerCase();
}
export const colors = {
	'dark-blue': '#005687',
	'mid-blue': '#0468B1',
	'mid-blue-semi': 'rgba(4,104,177,.75)',
	'light-blue': '#32BEE1',

	'dark-red': '#A51E41',
	'mid-red': '#FA1C26',
	'light-red': '#F03C8C',

	'dark-green': '#418246',
	'mid-green': '#61B233',
	'light-green': '#B4DC28',

	'dark-yellow': '#FA7814',
	'mid-yellow': '#FFC10E',
	'light-yellow': '#FFF32A',

	'dark-grey': '#000000',
	'mid-grey': '#646464',
	'light-grey': '#969696',

	'light-2': '#e5e5e5',
};
export const sdgcolors = [
	'#E5233B', // 1
	'#DDA839', // 2
	'#4D9F39', // 3
	'#C5182D', // 4
	'#FF3B21', // 5
	'#25BDE2', // 6
	'#FCC30C', // 7
	'#A21842', // 8
	'#FD6924', // 9
	'#DD1267', // 10
	'#FD9D25', // 11
	'#BE8B2F', // 12
	'#3F7E44', // 13
	'#0C97D9', // 14
	'#56C02A', // 15
	'#02689D', // 16
	'#18486A', // 17
];
export const polarToCartesian = function (angle, length, offset) {
	if (!offset) offset = [0, 0];
	const x = Math.cos(angle) * length + offset[0];
	const y = Math.sin(angle) * length + offset[1];
	return [x, y];
};
export const getCoordinates = function (angle, distance, width, height, abspadding) {
	if (!abspadding) abspadding = 0
	angle = angle * Math.PI / 180 - Math.PI / 2
	const length = Math.min(width, height) * distance + abspadding
	const offset = [ width / 2, height / 2 ]
	return polarToCartesian(angle, length, offset)
};
export const chunk = function (arr, size) {
	const groups = [];
	for (let i = 0; i < arr.length; i += size) {
		groups.push(arr.slice(i, i + size));
	}
	return groups;
};
export function sortpolygon (points, type) {
	if (!points.length) return points
	const unique = []
	points.forEach(d => {
		if (!unique.map(c => c.join('-')).includes(d.join('-'))) unique.push(d)
	})

	// INSPIRED BY https://stackoverflow.com/questions/14263284/create-non-intersecting-polygon-passing-through-all-given-points
	// FIND THE LEFT MOST POINT p AND TH RIGHT MOST POINT q
	const p = unique.sort((a, b) => a[0] - b[0])[0]
	const q = unique.sort((a, b) => b[0] - a[0])[0]
	// CONSIDERING THE FUNCTIONS THAT DEFINE THE pq SEGMENT IS
	// a * x + b
	const a = (p[1] - q[1]) / (p[0] - q[0])
	const b = p[1] - a * p[0]
	// FIND THE GROUP A OF POINTS ABOVE pq
	// A POINT (x, y) IS ABOVE pq IF y > ax + b
	// SEE https://math.stackexchange.com/questions/324589/detecting-whether-a-point-is-above-or-below-a-slope
	const A = unique.filter(d => d[1] > a * d[0] + b)
	A.sort((a, b) => a[0] - b[0])
	// AND THE GROUPP B OF POINTS BELOW pq
	const B = unique.filter(d => d[1] <= a * d[0] + b && ![p.join('-'), q.join('-')].includes(d.join('-')))
	B.sort((a, b) => b[0] - a[0])

	let sorted = [p]
	sorted = sorted.concat(A)
	sorted.push(q)
	sorted = sorted.concat(B)

	return sorted
}