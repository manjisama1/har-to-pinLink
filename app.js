const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

// Use Vercel's temp folder for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.env.VERCEL_TEMP || __dirname, 'uploads');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure the folder exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { links: null, downloadLink: null, linkCount: 0 });
});

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

        const outputPath = path.join(path.dirname(filePath), 'filtered_urls.txt');
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
    const file = path.join(process.env.VERCEL_TEMP || __dirname, 'uploads', 'filtered_urls.txt');
    res.download(file, (err) => {
        if (!err) {
            fs.unlinkSync(file);
        }
    });
});

// Use Vercel's dynamic port environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
