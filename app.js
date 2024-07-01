const cheerio = require('cheerio');
const fs = require('fs');

async function main() {
	let res = await fetch('https://www.resultats-elections.interieur.gouv.fr/legislatives2024/ensemble_geographique/index.html');
	let html = await res.text();
	let $ = cheerio.load(html);

	let select = $('#selectDep');
	let dpts = select.find('option');

	let links = [];
	for (let i = 0; i < dpts.length; i++) {
		let dpt = dpts[i];
		let code = $(dpt).attr('value');
		if (code !== '') links.push(`https://www.resultats-elections.interieur.gouv.fr/legislatives2024/ensemble_geographique/${code.replace('./', '')}`)
	}

	let cirLinks = [];
	for (const link of links) {
		let ress = await fetch(link);
		let htmls = await ress.text();
		let $$ = cheerio.load(htmls);

		let selects = $$('#selectCir');
		let cirs = selects.find('option');

		for (let i = 0; i < cirs.length; i++) {
			let cir = cirs[i];
			let code = $$(cir).attr('value');
			if (code !== '') cirLinks.push(`${link.replace('/index.html', '')}/${code.replace('./', '')}`)
		}
	}

	let results = [];
	for (const link of cirLinks) {
		let resss = await fetch(link);
		let htmlss = await resss.text();
		let $$$ = cheerio.load(htmlss);

		let table = $$$('table');
		let tbody = table.find('tbody');
		let rows = tbody.find('tr');

		// Parcourir les lignes du tableau
		let winners = [];
		let circo = link.split("/")[link.split("/").length - 2];
		for (let i = 0; i < rows.length; i++) {
			let row = rows[i];
			let cells = $$$('td', row);
			let elected = cells.eq(5).text().trim() === 'QUALIF T2' || cells.eq(5).text().trim() === 'OUI';
			if (elected) {
				let party = cells.eq(1).text().trim();
				let percent = cells.eq(4).text().trim();
				winners.push({ percent, party });
			}
		}

		if (winners.length > 0) results.push({ circo, winners });
	}

	let csv = `Circonscription;Resultats`;
	for (const result of results) {
		csv += `\n"${result.circo}";${result.winners.map(w => `${w.percent.toString().replace(',', '.')}, ${w.party}`).join(' - ')};${result.winners.length === 1 ? 'Elu':(result.winners.length === 3 ? 'Triangulaire':'Duel')}`;
	}
	fs.writeFileSync('resultats.csv', csv, {
		encoding: 'utf-8'
	});

	console.log('Fichier CSV généré avec succès !')
}

main();