const fs = require('fs');

const tempDirName = './temp';
if (!fs.existsSync(tempDirName)) {
    fs.mkdirSync(tempDirName);
}
const enData = JSON.parse(fs.readFileSync('../data/en.json', 'utf8'));

function printEnData(fd, prefix) {
    for (let key in enData.en) {
        if (key.startsWith(prefix)) {
            const value = enData.en[key];
            key = key.substring(prefix.length);
            fs.writeSync(fd, `${key},${value}\n`);
        }
    }
}

function printCountiesCsv() {
    const fd = fs.openSync('./temp/county.csv', 'w');
    fs.writeSync(fd, `id,county_name\n`);
    printEnData(fd, 'county.');
    fs.closeSync(fd);
}

function printStatesCsv() {
    const fd = fs.openSync('./temp/state.csv', 'w');
    fs.writeSync(fd, `st_id,st_name\n`);
    printEnData(fd, 'state.');
    fs.closeSync(fd);
}

function printCandidatesCsv() {
    const presidentMetadata = JSON.parse(fs.readFileSync('../data/president_metadata.json', 'utf8'));
    const fd = fs.openSync('./temp/candidate.csv', 'w');
    fs.writeSync(fd, `cand_id,cand_name,cand_party\n`);
    for (const id in presidentMetadata.cands) {
        const cand = presidentMetadata.cands[id];
        fs.writeSync(fd, `${id},${cand.fn},${cand.py}\n`);
    }
    fs.closeSync(fd);
}

function printVotesCsv() {
    const presidentData = JSON.parse(fs.readFileSync('../data/president.json', 'utf8'));
    const fd = fs.openSync('./temp/vote.csv', 'w');
    
    const rows = [];
    for (const president of presidentData.results) {
        const rowBase = {
            id: president.id,
            st: president.st,
            total_votes: president.total_votes,
            margin: president.margin || '',
            status: president.status || '',
            uncontested: typeof president.uncontested === 'boolean' ? president.uncontested : '',
        };

        if (president.cand.length === 0) {
            throw new Error('Expected at least one candidate.');
        }

        function Row() {}
        Row.prototype = rowBase;

        for (const i in president.cand) {
            const row = new Row();
            row.lead = president.cand[i] === president.lead[0];
            // console.log( president.cand[i] , president.lead[0], president.cand[i] === president.lead[0]);
            row.cand = president.cand[i];
            row.vote = president.vote[i];
            row.ev = president.ev ? president.ev[i] : '';

            rows.push(row);
        }
    }

    fs.writeSync(fd, `id,st_id,total_votes,lead,margin,status,uncontested,cand_id,vote,ev\n`);
    for (const row of rows) {
        fs.writeSync(fd, `${row.id},${row.st},${row.total_votes},${row.lead},${row.margin},${row.status},${row.uncontested},${row.cand},${row.vote},${row.ev}\n`);
    }

    fs.closeSync(fd);
}

function printJson() {
    // Load all source data
    const presidentMetadata = JSON.parse(fs.readFileSync('../data/president_metadata.json', 'utf8'));
    const presidentData = JSON.parse(fs.readFileSync('../data/president.json', 'utf8'));

    // Write state data to states.json
    const states = [];
    for (const president of presidentData.results) {
        // Ignore country entry
        if (president.id === president.st && president.id !== 'US') {
            president.state = enData.en['state.' + president.st];
            delete president.id;

            if (president.lead.length !== 1) {
                throw new Error(president.lead);
            }
            const leadId = president.lead[0];
            delete president.lead;

            let i = 0;
            const cands = [];
            for (let id of president.cand) {
                const cand = presidentMetadata.cands[id];
                cands.push({
                    id: id,
                    name: cand.fn,
                    party: cand.py,
                    lead: id === leadId,
                    vote: president.vote[i],
                    vp: president.vp[i],
                    ev: president.ev[i],
                });
                i++;
            }
            president.cands = cands;
            delete president.cand;
            delete president.vote;
            delete president.vp;
            delete president.ev;

            states.push(president);
        }
    }
    const fd = fs.openSync('./temp/states.json', 'w');
    fs.writeSync(fd, JSON.stringify(states));
    fs.closeSync(fd);

    // TODO: Write county data to counties.json
}

printCountiesCsv();
printStatesCsv();
printCandidatesCsv();
printVotesCsv();
printJson();

