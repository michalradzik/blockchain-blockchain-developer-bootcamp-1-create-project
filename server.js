const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Ścieżka do pliku dexes.json
const dexesFilePath = path.join(__dirname, 'dexes.json');

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint: Pobieranie historii swapów dla konkretnego AMM
app.get('/amm/:ammAddress/swaps', (req, res) => {
    const ammAddress = req.params.ammAddress;
    const dexesPath = path.join(__dirname, './src/dexes.json');

    try {
        if (!fs.existsSync(dexesPath)) {
            console.error('dexes.json file does not exist.');
            return res.status(404).json({ error: 'dexes.json file not found.' });
        }

        const dexes = JSON.parse(fs.readFileSync(dexesPath, 'utf8'));
        const amm = dexes.find(dex => dex.ammAddress === ammAddress);

        if (!amm) {
            console.error(`AMM with address ${ammAddress} not found.`);
            return res.status(404).json({ error: `AMM with address ${ammAddress} not found.` });
        }

        console.log(`Swaps for AMM ${ammAddress} fetched successfully.`);
        res.status(200).json(amm.swaps || []);
    } catch (error) {
        console.error('Error reading dexes file:', error);
        res.status(500).json({ error: 'Error reading dexes file.' });
    }
});


app.post('/amm/:ammAddress/swaps', (req, res) => {
    const ammAddress = req.params.ammAddress;
    const swapData = req.body;

    console.log(`Received POST request for AMM ${ammAddress}`);
    console.log('Swap data:', swapData);

    if (!swapData || !swapData.user || !swapData.tokenGive || !swapData.tokenGiveAmount || !swapData.tokenGet || !swapData.tokenGetAmount || !swapData.timestamp) {
        console.error('Invalid swap data received:', swapData);
        return res.status(400).json({ error: 'Invalid swap data' });
    }

    try {
        const dexesPath = path.join(__dirname, './src/dexes.json');
        const dexes = JSON.parse(fs.readFileSync(dexesPath, 'utf8'));

        const amm = dexes.find(dex => dex.ammAddress === ammAddress);
        if (!amm) {
            console.error(`AMM with address ${ammAddress} not found.`);
            return res.status(404).json({ error: 'AMM not found' });
        }

        amm.swaps.push(swapData);
        fs.writeFileSync(dexesPath, JSON.stringify(dexes, null, 2));

        console.log(`Swap successfully added to AMM ${ammAddress}`);
        res.status(200).json({ message: 'Swap added successfully' });
    } catch (error) {
        console.error('Error updating dexes.json:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Start serwera
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
