const path = require('path');
const express = require('express');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Set up views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

const UPLOADS_DIR = path.join(process.env.VERCEL_TEMP || __dirname, 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

app.get('/', (req, res) => {
    res.render('index', { links: null, downloadLink: null, linkCount: 0 });
});

// Dummy route to prevent favicon errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.post('/upload', upload.single('harFile'), (req, res) => {
    const filePath = req.file.path;

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const harData = JSON.parse(fileContent);
        const urls = harData.log.entries.map(entry => entry.request.url);

        const filteredUrls = new Set(
            urls.map(url => url.includes('/236x/') ? url.replace('/236x/', '/736x/') : (url.includes('/736x/') ? url : null))
        );

        const uniqueUrls = Array.from(filteredUrls).filter(Boolean);
        const linkCount = uniqueUrls.length;

        const outputPath = path.join(UPLOADS_DIR, 'filtered_urls.txt');
        fs.writeFileSync(outputPath, uniqueUrls.join('\n'), 'utf-8');

        fs.unlinkSync(filePath);

        res.render('index', {
            links: uniqueUrls,
            downloadLink: `/uploads/filtered_urls.txt`,
            linkCount: linkCount,
        });

    } catch (error) {
        console.error(`Error processing file: ${error.message}`);
        fs.unlinkSync(filePath);
        res.render('index', { links: null, downloadLink: null, linkCount: 0 });
    }
});

app.get('/uploads/filtered_urls.txt', (req, res) => {
    const file = path.join(UPLOADS_DIR, 'filtered_urls.txt');
    
    res.download(file, (err) => {
        if (!err) {
            fs.unlinkSync(file);
        }
    });
});

// Clean up the uploads directory after each request cycle
app.use((req, res, next) => {
    fs.rm(UPLOADS_DIR, { recursive: true, force: true }, () => {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    });
    next();
});

// Use Vercel's dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
