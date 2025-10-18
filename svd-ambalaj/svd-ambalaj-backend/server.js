const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const api = require('./netlify/functions/api');

const app = express();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

app.use('/.netlify/functions/api', api);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../svd-ambalaj-frontend/.next')));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
