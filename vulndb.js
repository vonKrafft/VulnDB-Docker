/* Copyright (c) 2020 vonKrafft <contact@vonkrafft.fr>
 * 
 * This file is part of VulnDB.
 * 
 * This file may be used under the terms of the GNU General Public License
 * version 3.0 as published by the Free Software Foundation and appearing in
 * the file LICENSE included in the packaging of this file. Please review the
 * following information to ensure the GNU General Public License version 3.0
 * requirements will be met: http://www.gnu.org/copyleft/gpl.html.
 * 
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

'use strict'

const express = require('express');
const cors = require('cors');
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');

// Environment variables
const DATABASE = process.env.DATABASE || 'vulndb.json';
const PORT = process.env.PORT || 5000;

// Create express app
let app = express();
app.use(cors());
app.use(express.json())
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT + '.');
});

// Static files
const indexFile = path.join(__dirname, 'build', 'index.html');
app.use(express.static('build'));
app.get('/', (req, res) => res.sendFile(indexFile));

// Root endpoint
app.get('/api', (req, res) => {
  res.json({ status: 'available' });
});

/*****************************************************************************
 * Retrieve all templates
 * GET <API_URL>/templates
 *****************************************************************************/

app.get('/api/templates', (req, res) => {
  let data = JSON.parse(fs.readFileSync(DATABASE));
  res.json({ status: 'success', data: data });
});

/*****************************************************************************
 * Retrieve a template by ID
 * GET <API_URL>/template/:uuid
 *****************************************************************************/

app.get('/api/template/:uuid', (req, res) => {
  let data = JSON.parse(fs.readFileSync(DATABASE));
  const template = data.find(o => o.uuid === req.params.uuid);
  if (template) {
    res.json({ status: 'success', data: template });
  } else {
    res.status(404).json({ status: 'not found' });
  }
});

/*****************************************************************************
 * Create a template
 * POST <API_URL>/template
 *****************************************************************************/

app.post('/api/template', (req, res) => {
  let data = JSON.parse(fs.readFileSync(DATABASE));
  const template = {
    uuid: uuid.v4(),
    title: req.body.title || null,
    owasp: req.body.owasp || null,
    description: req.body.description || null,
    consequences: req.body.consequences || null,
    recommendations: req.body.recommendations || null,
    language: req.body.language.toUpperCase() || 'FR'
  };
  data.push(template);
  fs.writeFileSync(DATABASE, JSON.stringify(data));
  res.status(201).json({ status: 'success', data: template });
});

/*****************************************************************************
 * Edit a template by ID
 * PUT <API_URL>/template/:uuid
 *****************************************************************************/

app.get('/api/template/:uuid', (req, res) => {
  let data = JSON.parse(fs.readFileSync(DATABASE));
  const template = data.find(o => o.uuid === req.params.uuid);
  if (template) {
    const index = data.indexOf(template);
    for (const [key, value] of Object.entries(req.body)) {
      if (key in template) { template[key] = value };
    }
    if (index > -1) data[index] = template;
    fs.writeFileSync(DATABASE, JSON.stringify(data));
    res.json({ status: 'success', data: template });
  } else {
    res.status(404).json({ status: 'not found' });
  }
});

/*****************************************************************************
 * Delete a template by ID
 * DELETE <API_URL>/template/:uuid
 *****************************************************************************/

app.get('/api/template/:uuid', (req, res) => {
  let data = JSON.parse(fs.readFileSync(DATABASE));
  const template = data.find(o => o.uuid === req.params.uuid);
  if (template) {
    const index = data.indexOf(template);
    if (index > -1) data.splice(index, 1);
    fs.writeFileSync(DATABASE, JSON.stringify(data));
    res.json({ status: 'success' });
  } else {
    res.status(404).json({ status: 'not found' });
  }
});

/*****************************************************************************
 * Download all templates as JSON
 * GET <API_URL>/export
 *****************************************************************************/

app.get('/api/export', (req, res) => {
  res.download(DATABASE, 'vulndb-export-' + Date.now() + '.json'); 
}); 
